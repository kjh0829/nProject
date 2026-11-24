"""Build the pose and render the Alchankki wardrobe study with Blender 4.3."""
import argparse
from bisect import bisect_right
from math import asin, cos, exp, pi, sin
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cel_style import add_outline, linear, style_materials


OUTFITS = {
    "hoodie": ("hoodie","hair","boots"),
    "hoodie-beret": ("hoodie","seat","hat","boots"),
    "coat": ("coat","hair","boots"),
    "coat-beret": ("coat","seat","hat","boots"),
    "sneakers": ("hoodie","hair","sneakers"),
}


def command_line():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--blend", type=Path)
    parser.add_argument("--draft", action="store_true")
    parser.add_argument("--outfit", choices=OUTFITS, action="append")
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:])


def material(name, color, roughness=.58, *, metal=0, cloth=False, surface=None):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*linear(color), 1)
    result.use_nodes = True
    result["studio_surface"] = surface or ("metal" if metal else "cloth" if cloth else "matte")
    nodes = result.node_tree.nodes
    links = result.node_tree.links
    shader = nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = result.diffuse_color
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metal
    if cloth:
        grain = nodes.new("ShaderNodeTexNoise")
        grain.inputs["Scale"].default_value = 18
        grain.inputs["Detail"].default_value = 1.2
        tint = nodes.new("ShaderNodeValToRGB")
        tint.color_ramp.elements[0].color = tuple(c*.90 for c in result.diffuse_color[:3]) + (1,)
        tint.color_ramp.elements[1].color = tuple(min(1,c*1.08+.003) for c in result.diffuse_color[:3]) + (1,)
        links.new(grain.outputs["Fac"], tint.inputs[0])
        links.new(tint.outputs[0], shader.inputs["Base Color"])
    return result


def put(obj, mat):
    obj.data.materials.append(mat)
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    return obj


def mesh(name, vertices, faces, mat, smooth=0):
    geometry = bpy.data.meshes.new(name)
    geometry.from_pydata(vertices, [], faces)
    geometry.update()
    obj = bpy.data.objects.new(name, geometry)
    bpy.context.collection.objects.link(obj)
    if smooth:
        modifier = obj.modifiers.new("Rounded pattern", "SUBSURF")
        modifier.levels = smooth
        modifier.render_levels = smooth
    return put(obj, mat)


def sphere(name, pos, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    return put(obj, mat)


def rings(name, rows, mat, *, start=0, stop=2*pi, count=40, cap=True, smooth=2, sculpt=None):
    """Elliptical cross sections in x/y. Angle zero is the front."""
    closed = stop - start >= 2*pi - 1e-5
    vertices = []
    for x, y, z, width, depth in rows:
        for i in range(count):
            a = start + (stop - start)*i/(count if closed else count-1)
            point = (x + width*sin(a), y - depth*cos(a), z)
            vertices.append(sculpt(point, a) if sculpt else point)
    faces = []
    for j in range(len(rows)-1):
        for i in range(count if closed else count-1):
            k = (i+1) % count
            faces.append(tuple(j*count + n for n in (i, k, k+count, i+count)))
    if closed and cap:
        faces.extend([tuple(reversed(range(count))), tuple(range(len(vertices)-count, len(vertices)))])
    return mesh(name, vertices, faces, mat, smooth)


def strand(name, points, radius, mat, *, radii=None, bevel=4, handles="AUTO"):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 12
    curve.bevel_resolution = bevel
    curve.bevel_depth = radius
    curve.use_fill_caps = True
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points)-1)
    for i, (point, co) in enumerate(zip(spline.bezier_points, points)):
        point.co = co
        point.handle_left_type = point.handle_right_type = handles
        if radii:
            point.radius = radii[i]
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    return put(obj, mat)


def tube(name, rows, mat, smooth=2, pleats=False):
    """Cross sections perpendicular to the arm or hair flow."""
    vertices = []
    count = 24
    centers = [Vector(row[:3]) for row in rows]
    for j, (center, row) in enumerate(zip(centers, rows)):
        tangent = (centers[min(j+1, len(rows)-1)] - centers[max(0, j-1)]).normalized()
        across = tangent.cross(Vector((0, 1, 0))).normalized()
        depth = across.cross(tangent).normalized()
        for i in range(count):
            a = i*2*pi/count
            fold = 0
            if pleats:
                front = max(0, -sin(a))**1.35
                for z, angle, width, strength in ((3.39,.26,.023,.022),(3.52,-.18,.035,.027),
                                                   (3.79,.28,.035,.029),(3.90,-.11,.049,.015)):
                    delta = (row[2]-z + angle*cos(a)*row[3]) / width
                    fold += strength * (exp(-delta*delta) - .65*exp(-(delta-1.2)**2))*front
            vertices.append(center + across*((row[3]+fold)*cos(a)) + depth*((row[4]+fold)*sin(a)))
    faces = [tuple(reversed(range(count)))]
    for j in range(len(rows)-1):
        for i in range(count):
            k = (i+1) % count
            faces.append(tuple(j*count+n for n in (i, k, k+count, i+count)))
    faces.append(tuple(range(len(vertices)-count, len(vertices))))
    return mesh(name, vertices, faces, mat, smooth)


def inset_panel(name, outline, mat, thickness=.012):
    center = tuple(sum(p[i] for p in outline)/len(outline) for i in range(3))
    n = len(outline)
    obj = mesh(name, [center, *outline], [(0, 1+i, 1+(i+1)%n) for i in range(n)], mat)
    solid = obj.modifiers.new("Cloth thickness", "SOLIDIFY")
    solid.thickness = thickness
    edge = obj.modifiers.new("Soft edge", "BEVEL")
    edge.width = thickness*.48
    edge.segments = 3
    return obj


def prepare_scene(draft):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = 14 if draft else 32
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 3
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.file_format = "PNG"
    scene.render.resolution_x = 680
    scene.render.resolution_y = 1060
    scene.render.resolution_percentage = 55 if draft else 100
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0
    scene.world = bpy.data.worlds.new("Warm studio")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get("Background").inputs[0].default_value = (.34, .29, .44, 1)
    scene.world.node_tree.nodes.get("Background").inputs[1].default_value = .47
    focus = Vector((0, -.02, 2.97))
    bpy.ops.object.camera_add(location=(-10.1, -19, 5.16))
    scene.camera = bpy.context.object
    scene.camera.name = "Shared orthographic outfit camera"
    scene.camera.rotation_euler = (focus - scene.camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera.data.type = "ORTHO"
    scene.camera.data.ortho_scale = 6.37

    for name, where, power, angle, color in [
        ("Warm drawing key", (-4.8, -6.6, 8.7), 1.86, .105, (1, .94, .91)),
        ("Face fill", (3.2, -5.2, 3.7), .38, .23, (.94, .94, 1)),
        ("Wave and shoulder rim", (1.5, 4.2, 7.1), .63, .115, (.92, .87, 1)),
    ]:
        bpy.ops.object.light_add(type="SUN", location=where)
        obj = bpy.context.object
        obj.name = name
        obj.data.energy, obj.data.angle, obj.data.color = power, angle, color
        obj.rotation_euler = (Vector((0, 0, 3.7)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    return scene


def interpolate(rows, z):
    for a, b in zip(rows, rows[1:]):
        if a[0] <= z <= b[0]:
            t = (z-a[0])/(b[0]-a[0])
            return [v+(w-v)*t for v, w in zip(a[1:], b[1:])]
    return (rows[0] if z < rows[0][0] else rows[-1])[1:]


# Widths follow the original three-quarter face. Depth is independent of
# the projected outline, with geometry for the brow, cheek, nose and chin.
FACE_SECTIONS = [
    (4, 156, 206, .045), (22, 103, 270, .170), (51, 64, 308, .234),
    (92, 37, 337, .293), (143, 20, 357, .338), (191, 20, 367, .359),
    (226, 46, 368, .359), (251, 63, 365, .365), (279, 70, 355, .369),
    (307, 76, 350, .373), (331, 82, 345, .373), (355, 92, 338, .379),
    (378, 103, 325, .369), (400, 123, 303, .357), (419, 147, 277, .315),
    (436, 173, 251, .256), (448, 202, 236, .191), (452, 220, 230, .088),
]
PORTRAIT_YAW = .485
PORTRAIT_RIGHT = Vector((cos(PORTRAIT_YAW), -sin(PORTRAIT_YAW), 0))
PORTRAIT_FRONT = Vector((-sin(PORTRAIT_YAW), -cos(PORTRAIT_YAW), 0))


def portrait_point(horizontal, depth, height):
    return PORTRAIT_RIGHT*horizontal + PORTRAIT_FRONT*depth + Vector((0, -.019, height))


def color_attributes(obj, name, colors):
    attribute = obj.data.color_attributes.new(name=name, type="FLOAT_COLOR", domain="POINT")
    for entry, color in zip(attribute.data, colors):
        entry.color = (*color, 1)


def painted_face_material(skin):
    paint = skin.copy()
    paint.name = "Wardrobe artwork on sculpted face"
    paint["studio_surface"] = "face"
    nodes, links = paint.node_tree.nodes, paint.node_tree.links
    shader = nodes.get("Principled BSDF")
    mask = nodes.new("ShaderNodeVertexColor")
    mask.layer_name = "Paint coverage"
    image = nodes.new("ShaderNodeTexImage")
    image.interpolation = "Linear"
    art = Path(__file__).resolve().parents[2] / "docs/assets/avatar-art/wardrobe-v1/faces.png"
    image.image = bpy.data.images.load(str(art), check_existing=True)
    image.image.pack()
    mix = nodes.new("ShaderNodeMixRGB")
    mix.inputs[1].default_value = skin.diffuse_color
    links.new(mask.outputs["Color"], mix.inputs[0])
    links.new(image.outputs["Color"], mix.inputs[2])
    links.new(mix.outputs[0], shader.inputs["Base Color"])
    return paint, image.image.size[:]


def face(skin, gold):
    paint, (width, height) = painted_face_material(skin)
    count, levels = 112, 84
    vertices, uvs, coverage = [], [], []
    cross_section = smooth_profile(FACE_SECTIONS)
    for j in range(levels):
        v = 4 + (452-4)*j/(levels-1)
        left, right, thick = cross_section(v)
        lower_face = smooth_range(v,188,430)
        for k in range(count):
            a = k*2*pi/count
            u = (right+left)/2 + sin(a)*(right-left)/2
            frontal = max(0, cos(a))
            tip = .056*exp(-((u-268)/27)**2 - ((v-315)/29)**2)
            bridge = .026*exp(-((u-255)/32)**2 - ((v-279)/46)**2)
            cheek = .024*exp(-((u-145)/53)**2 - ((v-293)/51)**2)
            orbital = -.017*exp(-((u-165)/55)**2 - ((v-246)/35)**2)
            chin = .066*smooth_range(v,381,452)
            d = thick*cos(a) + (tip+bridge+cheek+orbital)*frontal + chin
            vertices.append(portrait_point((u-181)*.00228*(1+.045*lower_face),
                                           d, 5.663-v*.00222-.088*lower_face))
            # UVs align each level with the source rows. The three-quarter
            # painted features wrap into the skin colour at the temples.
            uvs.append(((124 + min(right-1.5, max(left+1.5, u)))/width, 1-(22+v)/height))
            f = max(0, min(1, (cos(a)+.24)/.47))
            coverage.append((f,f,f))
    faces = [tuple(range(count))]
    for j in range(levels-1):
        for k in range(count):
            n = (k+1)%count
            faces.append((j*count+k,(j+1)*count+k,(j+1)*count+n,j*count+n))
    faces.append(tuple(reversed(range(len(vertices)-count,len(vertices)))))
    head = mesh("Sculpted brow, nose, cheek and tapered jaw", vertices, faces, paint, 1)
    uv = head.data.uv_layers.new(name="Original wardrobe face")
    for loop in head.data.loops:
        uv.data[loop.index].uv = uvs[loop.vertex_index]
    color_attributes(head, "Paint coverage", coverage)

    ear = sphere("Ear beneath the side locks", portrait_point(-.318,.113,5.042), (.104,.062,.125), skin)
    ear.rotation_euler.z = -PORTRAIT_YAW
    inset = material("Ear warm shade", "bb7565", .72)
    ear_shape = sphere("Ear concha", portrait_point(-.347,.164,5.033), (.044,.017,.067), inset)
    ear_shape.rotation_euler.z = -PORTRAIT_YAW
    sphere("Small gold earring", portrait_point(-.315,.173,4.959), (.025,.021,.025), gold)


def hair_strokes(obj, masks, columns, levels, phase):
    color_attributes(obj,"Hair paint masks",masks)
    uv = obj.data.uv_layers.new(name="Hair stroke UV")
    for face in obj.data.polygons:
        corners = [obj.data.loops[i].vertex_index for i in face.loop_indices]
        across = [(column/columns+.5) % 1 for column in (i % columns for i in corners)]
        # The UV seam belongs on the rear of a lock. Keep each quad continuous.
        wraps = len(corners) == 4 and max(across)-min(across) > .5
        for loop,vertex,u in zip(face.loop_indices,corners,across):
            uv.data[loop].uv = (u+int(wraps and u<.5)+phase*.062,
                                (vertex//columns)/(levels-1))


def hair_lock(name, rows, material, palette, phase):
    """A shallow, slightly twisted ribbon with lengthwise painted fibres."""
    shade, tone, shine = palette
    count = 48
    path = [portrait_point(x,depth,z) for x,depth,z,_,_ in rows]
    vertices, colors, masks = [], [], []
    for j, (center,row) in enumerate(zip(path,rows)):
        t = j/(len(rows)-1)
        tangent = (path[min(j+1,len(path)-1)]-path[max(0,j-1)]).normalized()
        across = tangent.cross(PORTRAIT_FRONT).normalized()
        front = across.cross(tangent).normalized()
        twist = .18*sin(7.6*t+phase)
        ridge_center = -.23+.20*sin(5*t+phase)
        for k in range(count):
            a = k*2*pi/count
            width, facing = sin(a), cos(a)
            light_side = max(0,facing)
            thickness = row[4]*facing*(.65+.35*exp(-((width-ridge_center)/.48)**2))
            depth = thickness + row[3]*width*twist
            vertices.append(center+across*(row[3]*width)+front*depth)
            contour = .31+.58*light_side**.67
            variation = .05*cos(8.1*width+3*t+phase)*light_side
            tint = .065*smooth_range(t,.48,1)*light_side
            colors.append(tuple(d+(b-d)*(contour+variation)+(h-b)*tint
                                for d,b,h in zip(shade,tone,shine)))
            root = .54*exp(-((t+.03)/.245)**2)
            fold = .48*(1-light_side)**1.4
            glint = exp(-((t-.35-.117*width-.052*sin(phase))/.115)**2)
            end_glint = exp(-((t-.73+.092*width-.071*cos(phase))/.090)**2)
            break_up = .76+.24*cos(8.5*width+phase+2*t)
            ribbon = (.57*glint*break_up+.29*end_glint)*light_side**1.15
            strokes = (.12+.34*glint+.23*end_glint)*light_side**1.4
            masks.append((min(.91,root+fold),ribbon,strokes))
    faces = [tuple(reversed(range(count)))]
    for j in range(len(rows)-1):
        for k in range(count):
            n = (k+1)%count
            faces.append(tuple(j*count+i for i in (k,n,n+count,k+count)))
    faces.append(tuple(range(len(vertices)-count,len(vertices))))
    obj = mesh(name,vertices,faces,material,2)
    color_attributes(obj,"Lilac pigments",colors)
    hair_strokes(obj,masks,count,len(rows),phase)


def feather_lock(label, rows, material, palettes, phase, tip_spread):
    """Offset the sibling ribbons in width, depth and the positions of their tips."""
    for n, (edge, scale, role) in enumerate(((-.16,.79,"main"),(.61,.30,"split tip"))):
        split = []
        for j,(x,d,z,w,thickness) in enumerate(rows):
            t = j/(len(rows)-1)
            curl = sin(pi*t)*(sin(5.5*t+phase+n*.83)*.19+.12*edge)
            taper = abs(edge)*t**1.7
            split.append((x+w*(edge+curl)+edge*tip_spread*t**1.55,
                          d+(.014 if n==0 else -.014)+.009*sin(8*t+phase+n),
                          z + taper*(.145 if n==0 else -.064),
                          w*scale,
                          thickness*(.67-.21*t)))
        hair_lock(f"{label} | {role}",split,material,palettes[n],phase+n*.71)


def hair(materials, hatted=False):
    lock, fine = materials
    deep, violet, orchid, blush, silver = [linear(c) for c in
         ("3d294c","77518e","946db0","ae8cbf","e1c7ef")]
    def sculpt(label, rows, pale, phase, tip_spread=.063):
        main = (deep,orchid if pale else violet,silver)
        accent = (deep,blush if pale else orchid,silver)
        feather_lock(label,rows,lock,(main,accent),phase,tip_spread)

    vertices, faces, scalp_colors, scalp_masks = [], [], [], []
    count = 96
    for j in range(31):
        for k in range(count):
            a = k*2*pi/count
            reach = .805 + 1.53*((1-cos(a))/2)**.63
            t = .012 + (reach-.012)*j/30
            top = 5.205 + .49*cos(t)
            if hatted:
                top = min(top, 5.58+.18*(top-5.58))
            vertices.append(portrait_point(.483*sin(t)*sin(a),
                    .453*sin(t)*cos(a)-.058,top))
            root = .28 + .27*max(0,cos(a))**.6
            stroke = (.085*cos(22*a+2.9*t)+.046*cos(39*a-4*t))*sin(1.3*t)
            scalp_colors.append(tuple(shade+(pigment-shade)*(root+stroke)
                                       for shade,pigment in zip(deep,orchid)))
            front = .26+.74*max(0,cos(a))
            sheen = exp(-((t-.49-.095*sin(a*2))/.155)**2)*front
            scalp_masks.append((.51*exp(-(t/.29)**2)+.23*(1-front),.46*sheen,.32*sheen+.08*front))
    faces.append(tuple(range(count)))
    for j in range(30):
        for k in range(count):
            n = (k+1)%count
            faces.append(tuple(j*count+i for i in (k,k+count,n+count,n)))
    scalp = mesh("Combed crown and back volume",vertices,faces,lock,1)
    color_attributes(scalp,"Lilac pigments",scalp_colors)
    hair_strokes(scalp,scalp_masks,count,31,.82)

    # The two shoulders have independent arcs. The near outer lock opens
    # after the ear and folds back down; the far one folds sooner and ends high.
    outer_profiles = {
        -1: [(.279,.037,5.520,.078,.044),(.478,.047,5.282,.119,.047),
             (.496,.049,5.055,.111,.052),(.429,.097,4.857,.115,.046),
             (.493,.142,4.690,.116,.044),(.677,.169,4.541,.104,.039),
             (.780,.198,4.410,.076,.029),(.729,.237,4.313,.055,.023),
             (.610,.264,4.258,.042,.019),(.617,.298,4.127,.002,.003)],
         1: [(.277,.045,5.527,.081,.047),(.477,.038,5.315,.109,.046),
             (.500,.068,5.073,.114,.045),(.435,.110,4.901,.107,.040),
             (.486,.144,4.741,.104,.039),(.649,.190,4.622,.106,.038),
             (.716,.229,4.511,.073,.028),(.688,.273,4.406,.052,.022),
             (.570,.309,4.387,.044,.021),(.545,.328,4.286,.002,.003)],
    }
    supporting_profiles = [
       [(.31,.16,5.45,.075,.044),(.46,.21,5.20,.114,.051),(.43,.23,4.97,.108,.046),
        (.39,.25,4.82,.089,.039),(.51,.33,4.66,.077,.052),(.66,.37,4.51,.075,.043),
        (.65,.41,4.37,.070,.044),(.49,.36,4.23,.049,.032),(.49,.32,4.09,.003,.003)],
       [(.33,.04,5.46,.067,.039),(.53,.02,5.18,.090,.041),(.56,.09,4.98,.084,.043),
        (.56,.14,4.79,.073,.039),(.66,.22,4.63,.070,.042),(.76,.12,4.49,.064,.039),
        (.70,.04,4.37,.052,.029),(.60,.05,4.34,.032,.023),(.58,.12,4.40,.002,.002)],
       [(.39,.22,5.32,.058,.031),(.44,.31,5.12,.080,.046),(.49,.30,4.96,.062,.040),
        (.40,.26,4.80,.065,.045),(.34,.29,4.62,.071,.047),(.44,.41,4.47,.066,.042),
        (.53,.40,4.33,.047,.032),(.40,.39,4.18,.041,.026),(.31,.30,4.18,.002,.002)],
       [(.38,.02,5.30,.055,.028),(.50,.04,5.09,.067,.032),(.46,.12,4.91,.055,.028),
        (.50,.22,4.75,.051,.038),(.59,.27,4.65,.051,.034),(.63,.27,4.52,.038,.027),
        (.54,.27,4.45,.026,.016),(.50,.31,4.50,.002,.002)],
    ]
    # The visible-side fringe crosses the temple and ear before curling over
    # the shoulder. Its front surface stays ahead of the ear around 5.04.
    temple_profile = [
        (.207,.324,5.531,.061,.019),(.325,.358,5.341,.089,.027),
        (.390,.322,5.177,.104,.033),(.343,.293,5.019,.132,.037),
        (.325,.278,4.843,.109,.032),(.366,.308,4.692,.106,.029),
        (.515,.343,4.550,.092,.026),(.564,.385,4.417,.071,.026),
        (.484,.414,4.293,.053,.020),(.356,.389,4.235,.002,.003),
    ]
    # A darker layer behind the neck connects the curls to the crown, with
    # enough space between its tapered ends for the shoulder to show.
    nape = [(.365,-.079,5.202,.101,.042),(.374,-.083,4.992,.131,.040),
            (.338,-.104,4.796,.146,.044),(.310,-.108,4.638,.136,.035),
            (.400,-.080,4.471,.130,.034),(.475,-.041,4.353,.092,.024),
            (.441,.003,4.228,.044,.016),(.366,.055,4.217,.002,.003)]
    for side in (-1,1):
        inset = .038 if side < 0 else 0
        lift = .05 if side > 0 else 0
        drape = [(side*(x-inset*exp(-((z-4.58)/.24)**2)),d,z+lift*i/7,w,t)
                 for i,(x,d,z,w,t) in enumerate(nape)]
        hair_lock("Hair behind the jaw and collar",drape,lock,(deep,violet,blush),side*.61)

    # The near shoulder carries a wider curl. On the far side the hair
    # turns back towards the collar and ends above the near-side tips.
    tips = {
        -1: [(.018,-.005),(-.056,.060),(.123,.020),(.040,-.068),(.183,-.019)],
         1: [(.132,-.035),(.082,-.082),(.204,-.027),(.163,-.092),(.090,.030)],
    }
    for side, order in [(-1,(0,2,1,3,4)),(1,(0,2,1,3))]:
        for i in order:
            rows = []
            lift,fan = tips[side][i]
            at_temple = side == -1 and i == 1
            if i == 0:
                profile, role = outer_profiles[side], "Outer silhouette"
            elif at_temple:
                profile, role = temple_profile, "Temple sweep"
            else:
                profile, role = supporting_profiles[i-1], "Underlapping curl"
            for j,(x,depth,z,w,thickness) in enumerate(profile):
                fall = 1-smooth_range(z,4.13,4.81)
                swing = sin(5.5*fall+i*.93)*.17*fall
                eye_room = .113*exp(-((z-5.152)/.253)**2)-.014 if side>0 else 0
                bias = .55 if i==2 else 1
                if hatted and at_temple and j<2:
                    depth -= .094 if j==0 else .024
                    z -= .101 if j==0 else .022
                rows.append((side*(x+fall*fan+swing*bias)+eye_room,
                             depth+(.035*cos(i*1.24+fall*4.1)*fall),
                             z+fall*lift,w,
                             thickness*(.94 if i==1 else .84)))
            name = f"{'Near' if side < 0 else 'Far'} shoulder | {role} {i+1}"
            sculpt(name,rows,i in (1,3),i*.91+side*.31,tip_spread=.15 if i in (0,2) else .09)
        guide = [
            (.468,.106,5.048),(.589,.146,4.886),(.738,.162,4.763),(.808,.199,4.644),
            (.777,.247,4.535),(.668,.279,4.480)
        ] if side<0 else [
            (.478,.128,4.977),(.555,.162,4.831),(.678,.197,4.732),(.772,.253,4.622),
            (.756,.286,4.520),(.674,.326,4.451)
        ]
        strand("Off-silhouette hair accent", [portrait_point(side*x,d,z) for x,d,z in guide],
               .0075,fine,radii=[.07,.61,.90,.74,.39,.03])

    shoulder_flick = [(-.410,.257,4.995,.014,.009),(-.419,.310,4.850,.034,.015),
                     (-.502,.358,4.718,.042,.017),(-.651,.369,4.588,.048,.018),
                     (-.730,.353,4.477,.033,.015),(-.730,.319,4.383,.022,.012),
                     (-.792,.273,4.331,.002,.002)]
    hair_lock("Near shoulder | loose tapered lock",shoulder_flick,lock,(deep,blush,silver),1.91)

    bangs = [
       [(.094,.19,5.69,.065,.044),(-.039,.286,5.634,.115,.046),(-.208,.357,5.511,.108,.045),
        (-.344,.317,5.360,.098,.041),(-.443,.230,5.210,.070,.036),(-.434,.214,5.090,.034,.023),
        (-.363,.246,5.085,.002,.003)],
       [(.111,.206,5.665,.048,.041),(.015,.365,5.574,.087,.042),(-.139,.422,5.452,.093,.040),
        (-.257,.407,5.301,.074,.034),(-.33,.366,5.196,.044,.025),(-.385,.292,5.175,.002,.002)],
       [(.103,.234,5.665,.035,.032),(.214,.337,5.575,.095,.043),(.311,.363,5.454,.110,.043),
        (.389,.342,5.316,.092,.044),(.434,.288,5.18,.049,.027),(.413,.267,5.071,.002,.002)],
       [(.116,.189,5.687,.025,.022),(.247,.255,5.624,.093,.056),(.381,.251,5.492,.112,.056),
        (.476,.197,5.348,.074,.041),(.492,.177,5.234,.041,.023),(.453,.189,5.149,.002,.002)],
    ]
    for i, raw in enumerate(bangs):
        raw = [(x+.048*(1-smooth_range(j,1,4)),d,z,w,thickness)
               for j,(x,d,z,w,thickness) in enumerate(raw)]
        if i>=2:
            raw = [(x+.066*max(0,min(1,(5.49-z)/.20)),d,z,w*(.87 if j>2 else 1),depth)
                   for j,(x,d,z,w,depth) in enumerate(raw)]
        if hatted:
            raw = [(x,d-.128 if j<3 else d,z-(.137 if j<3 else .012),
                    w*(.84 if j<2 else 1),depth) for j,(x,d,z,w,depth) in enumerate(raw)]
        sculpt("Fine side-swept fringe",raw,i in (0,2),.31+i*1.35)

    loose_fringe = [(.123,.247,5.657,.019,.012),(.047,.366,5.581,.036,.018),
        (-.082,.439,5.480,.050,.019),(-.171,.441,5.379,.043,.018),
        (-.215,.421,5.295,.033,.016),(-.274,.380,5.229,.027,.014),
        (-.343,.329,5.179,.016,.008),(-.402,.285,5.159,.002,.002)]
    if hatted:
        loose_fringe = [(x,d-(.100 if j<2 else 0),z-(.13 if j<2 else 0),w,thickness)
                       for j,(x,d,z,w,thickness) in enumerate(loose_fringe)]
    hair_lock("Light strand over the temple",loose_fringe,lock,(deep,blush,silver),.72)


def flower(name, x, y, z, r, petals, middle):
    for i in range(5):
        a = i*2*pi/5
        obj = sphere(name+" petal", (x+r*.59*sin(a), y-.012, z+r*.59*cos(a)), (r*.29,r*.18,r*.48), petals)
        obj.rotation_euler.y = a
    sphere(name+" centre", (x,y-r*.24,z), (r*.29,r*.15,r*.29), middle)


def beret(cream, edge, gold):
    rows = [
        (0, .031, 5.355, .504, .415), (0, .03, 5.39, .523, .429),
        (-.017,.035,5.456,.548,.447), (-.062,.041,5.54,.622,.481),
        (-.105,.053,5.665,.579,.453), (-.152,.064,5.756,.454,.361),
        (-.177,.062,5.794,.265,.233), (-.172,.055,5.808,.031,.034)
    ]

    def woven_crown(point, angle):
        x,y,z = point
        f = max(0, 1-((z-5.59)/.23)**2)
        panel = .023*sin(5*angle+3*z)+.011*sin(8*angle-8*z)
        gather = .032*exp(-((angle-.62)/.29)**2)-.018*exp(-((angle-.94)/.22)**2)
        bend = (panel+gather)*f
        return x+bend*sin(angle),y-bend*cos(angle),z-x*.115+bend*.42

    rings("Soft paneled wool beret", stitched_rows(rows,.027), cream, sculpt=woven_crown, smooth=1)
    rim = rings("Fitted wool hatband", [(*row[:3],row[3]+.010,row[4]+.010) for row in rows[:3]], edge, cap=False)
    for v in rim.data.vertices:
        v.co.z -= v.co.x*.115
    for z, radius, tint in ((5.416,.0085,gold),(5.382,.010,cream)):
        pts = [(-.006+.522*sin(t),.034-.438*cos(t),z-.060*sin(t))
               for t in (i*2*pi/58 for i in range(59))]
        strand("Banded hat edge",pts,radius,tint)
    nub = sphere("Wool top tab", (-.215,.038,5.843), (.030,.030,.047), edge)
    nub.rotation_euler.y = -.49

    ribbon = material("Apricot champagne silk","d4ab86",.35,cloth=True)
    flower_cream = material("Ecru enamel petals","fff0d0",.37)
    x,y,z = -.452,-.291,5.536
    for side in (-1,1):
        loop = [(x,y,z),(x+side*.106,y+.014,z+.096),(x+side*.202,y+.060,z+.070),
                (x+side*.17,y+.042,z-.010),(x+side*.080,y-.021,z-.028)]
        inset_panel("Folded satin bow loop",loop,ribbon,.013)
        strand("Folded ribbon edging",loop[1:],.0062,gold,radii=[.35,1,.87,.12])
        tail = [(x,y,z-.030),(x+side*.072,y-.017,z-.054),
                (x+side*.105,y-.013,z-.258),(x+side*.047,y-.025,z-.225),
                (x+side*.017,y-.031,z-.282)]
        inset_panel("Cut satin ribbon tail",tail,ribbon,.009)
        strand("Gold thread on ribbon",tail[1:],.0052,gold)
    flower("Enamel dogwood brooch",x,y-.066,z+.010,.072,flower_cream,gold)
    flower("Tiny leaf pin",x-.080,y-.052,z+.073,.037,gold,flower_cream)


DENIM = [
    (.58,.10,.153,.141), (.71,.14,.160,.147), (.94,.155,.168,.154),
    (1.20,.12,.175,.156), (1.53,.054,.195,.170), (1.78,.015,.206,.191),
    (2.035,.013,.232,.216), (2.31,.017,.255,.248), (2.55,.033,.282,.257),
    (2.80,.068,.269,.247), (3.02,.082,.252,.224), (3.22,.09,.235,.202),
]


def low_position(side):
    return side*(.40 if side < 0 else .38), -.03 if side < 0 else .17


def trousers(denim, bright, dark, stitches):
    before = set(bpy.context.scene.objects)
    pieces, turned_hems = [], []

    def knee_fold(point, a):
        x,y,z = point
        d = 0
        for center,skew,width,height in ((1.62,.16,.057,.019),(1.48,-.10,.052,.011)):
            v = (z-center+skew*sin(a))/width
            d += height*(exp(-v*v)-.60*exp(-(v-1.2)**2))*max(0,cos(a))
        return x+d*sin(a),y-d*cos(a),z
    for side in (-1, 1):
        points = []
        basex, basey = low_position(side)
        for z, cy, rx, ry in DENIM:
            blend = max(0, min(1,(z-.85)/2.15))
            cx = basex*(1-blend)+side*.217*blend
            points.append((cx, cy+basey*(1-blend), z, rx, ry))
        pieces.append(rings("Tapered denim with knee ease", stitched_rows(points,.057), denim,
                            count=38, smooth=1, sculpt=knee_fold))
        for offset, tint, width in [(0,dark,.011),(-.028,stitches,.004)]:
            strand("Outseam", [(cx+(rx-.010)*side, cy+offset, z) for cx,cy,z,rx,ry in points[:-1]], width, tint)
        cuff = [(x,y,z+.015+k,rx+.009,ry+.006) for k,(x,y,z,rx,ry) in zip((0,.04),points[:2])]
        turned_hems.append(rings("Turned denim hem for low shoes", cuff, bright, cap=False))
    pieces.append(rings("Denim seat", [(0,.075,2.79,.407,.214),
        (0,.07,2.99,.440,.241),(0,.07,3.17,.418,.229),
        (0,.068,3.27,.405,.218),(0,.058,3.35,.361,.199)],denim))
    # Fuse the overlapping hip and leg pattern pieces into one fabric surface.
    bpy.ops.object.select_all(action="DESELECT")
    for piece in pieces:
        piece.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.join()
    pants = bpy.context.object
    pants.name = "Joined denim pattern"
    pants.data.remesh_voxel_size = .014
    bpy.ops.object.voxel_remesh()
    pants.data.materials.clear()
    put(pants, denim)
    smooth = pants.modifiers.new("Smooth crotch seam", "SMOOTH")
    smooth.factor, smooth.iterations = .8, 11
    washes = []
    for v in pants.data.vertices:
        x,y,z = v.co
        width = .354 if z<1.75 else .287
        facing = max(0,min(1,(-y+.04)/.22))
        wear = facing * exp(-((abs(x)-width)/.14)**2)
        wear *= .72*exp(-((z-2.39)/.49)**2) + .42*exp(-((z-1.51)/.178)**2)
        washes.append((.81+.40*wear,.84+.49*wear,.92+.57*wear))
    color_attributes(pants,"Faded indigo on raised fabric",washes)
    nodes, links = denim.node_tree.nodes, denim.node_tree.links
    diffuse = nodes.get("Principled BSDF").inputs["Base Color"]
    pigment = nodes.new("ShaderNodeVertexColor")
    pigment.layer_name = "Faded indigo on raised fabric"
    multiply = nodes.new("ShaderNodeMixRGB")
    multiply.blend_type = "MULTIPLY"
    multiply.inputs[0].default_value = 1
    links.new(diffuse.links[0].from_socket, multiply.inputs[1])
    links.new(pigment.outputs["Color"], multiply.inputs[2])
    links.new(multiply.outputs[0], diffuse)
    front = garment_front(pants)
    for side in (-1,1):
        pattern = [(.143,3.235),(.172,3.181),(.216,3.145),(.267,3.131),(.311,3.146)]
        strand("Inset denim pocket",[front(side*x,z,.006) for x,z in pattern],.008,dark,
               radii=[.23,.93,1,.92,.30])
        strand("Pocket twin-needle seam",[front(side*(x+.009),z-.013,.008) for x,z in pattern],
               .0039,stitches,radii=[.13,.85,.96,.81,.18])
    fly = [(.037,3.270),(.044,3.153),(.059,3.047),(.086,2.981),(.109,2.966)]
    strand("Recessed fly seam",[front(x,z,.005) for x,z in fly],.007,dark,
           radii=[.40,.9,1,.77,.25])
    strand("Fly topstitch",[front(x+.012,z,.007) for x,z in fly],.0032,stitches,
           radii=[.32,.93,1,.80,.16])
    mark_region(before, "leg")
    return turned_hems


def hands(skin):
    for side in (-1, 1):
        before = set(bpy.context.scene.objects)
        x = side*(1.028 if side < 0 else .954)
        y = -.072 if side < 0 else -.19
        z = 3.04 if side < 0 else 3.09
        wrist = (x-side*.045,y,z+.202)
        tube("Wrist and palm", [(*wrist,.062,.066),(x,y,z+.033,.092,.064),
             (x+side*.032,y-.013,z-.025,.083,.054),(x+side*.042,y-.029,z-.076,.055,.041)],skin,2)
        for i, length in enumerate((.12,.154,.149,.115)):
            d = (.5-i/3)*.132
            px=x+side*(.042+d)
            tube("Relaxed finger", [(px, y-.014, z-.038, .029,.030),
                  (px+side*.027,y-.040,z-.080,.024,.024),
                  (px+side*.032,y-.078,z-.052-length,.017,.017),
                  (px+side*.027,y-.089,z-.062-length,.005,.007)],skin,1)
        tube("Curved thumb",[(x-side*.045,y-.02,z+.062,.039,.041),(x-side*.075,y-.059,z-.004,.032,.031),
             (x-side*.067,y-.10,z-.083,.024,.021),(x-side*.051,y-.104,z-.109,.009,.010)],skin,1)
        mark_region(before, "arm", side)
    neck_mat = skin.copy()
    neck_mat.name = "Skin under the jaw"
    neck_mat["studio_surface"] = "neck"
    neck = rings("Taper from jaw to collar",[(0,.016,4.25,.171,.154),(-.006,-.012,4.40,.124,.133),
          (-.006,-.013,4.53,.099,.111),(-.003,-.016,4.65,.108,.120),
          (.003,-.019,4.77,.138,.138),(.009,-.020,4.84,.157,.144)],neck_mat)
    warm_shadow = linear("b77b78")
    color_attributes(neck,"Neck and throat tint",[
        tuple(c+(shadow-c)*(.46*smooth_range(v.co.z,4.53,4.77))
              for c,shadow in zip(skin.diffuse_color,warm_shadow))
        for v in neck.data.vertices
    ])
    pigment = neck_mat.node_tree.nodes.new("ShaderNodeVertexColor")
    pigment.layer_name = "Neck and throat tint"
    shader = neck_mat.node_tree.nodes.get("Principled BSDF")
    neck_mat.node_tree.links.new(pigment.outputs["Color"],shader.inputs["Base Color"])


TORSO = [
    (0,.044,3.28,.405,.255),(0,.045,3.38,.420,.260),(0,.061,3.63,.382,.235),
    (0,.052,3.85,.431,.275),(0,.047,4.062,.474,.288),(0,.025,4.22,.473,.246),
    (0,.014,4.319,.441,.215),(0,-.003,4.355,.324,.208),(0,-.004,4.394,.204,.171)
]


def sleeves(fabric, cuff, trim=None):
    for side in (-1,1):
        before = set(bpy.context.scene.objects)
        x = (1.028 if side < 0 else .954)
        dy = -.072 if side < 0 else -.19
        dz = 3.04 if side < 0 else 3.09
        rows = [(side*.383,.024,4.238,.176,.196),(side*.502,.024,4.192,.182,.193),
                (side*.568,.029,4.139,.172,.174),(side*.637,.036,4.010,.157,.161),
                (side*.680,.032,3.918,.155,.149),(side*.724,.023,3.827,.143,.152),
                (side*.76,.013,3.73,.147,.149),(side*(x-.211),dy+.030,3.608,.132,.137),
                (side*(x-.18),dy+.023,3.503,.121,.126),(side*(x-.125),dy+.014,3.434,.128,.119),
                (side*(x-.10),dy+.010,dz+.36,.130,.123),(side*(x-.053),dy,dz+.20,.108,.104),
                (side*(x-.035),dy,dz+.141,.099,.096)]
        tube("Fitted sleeve with diagonal elbow folds", rows, fabric, pleats=True)
        lx,ly,lz,lw,ld = rows[-1]
        tube("Finished wrist cuff", [(lx-side*.021,ly,lz+.080,lw*1.12,ld*1.13),
             (lx-side*.012,ly,lz+.058,lw*1.13,ld*1.14),
             (lx,ly,lz+.012,lw*1.04,ld*1.06),
             (lx+side*.004,ly,lz+.008,lw*.94,ld*.96)],cuff,1)
        if trim:
            strand("Cuff saddle stitching", [(side*(x-.141+i*.020),dy-.091,dz+.227-i*.010) for i in range(7)],.009,trim)
            for i in range(2):
                sphere("Working sleeve button", (side*(x+.011-i*.019),dy-.093,dz+.22+i*.068),(.023,.016,.024),trim)

        mark_region(before, "arm", side)


def tailored_fold(point, angle, strength=1):
    x,y,z = point
    pucker = 0
    for center, bias, span, height in ((3.49,.22,.043,.023),(3.61,-.26,.038,.021),
                                      (3.75,-.31,.038,.022),(4.08,.17,.055,.013)):
        t = (z-center + bias*x)/span
        pucker += height*(exp(-t*t) - .66*exp(-(t-1.23)**2))
    pucker *= max(0, cos(angle))**.8 * strength
    return x+sin(angle)*pucker, y-cos(angle)*pucker, z


def stitched_rows(rows, step=.035):
    coords = [tuple((z,x,y,w,d)) for x,y,z,w,d in rows]
    z0,z1 = rows[0][2],rows[-1][2]
    return [(x,y,z,w,d) for z in (z0+(z1-z0)*i/round((z1-z0)/step)
                                     for i in range(round((z1-z0)/step)+1))
                         for x,y,w,d in [interpolate(coords,z)]]


def garment_front(obj):
    """Sample the finished fabric so seams and hardware follow its surface."""
    bpy.context.view_layer.update()
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    world = evaluated.matrix_world
    inverse = world.inverted()
    direction = (inverse.to_3x3() @ Vector((0,1,0))).normalized()

    def point(x, z, relief=0):
        hit, local, normal, _ = evaluated.ray_cast(inverse@Vector((x,-3,z)),direction)
        if not hit:
            raise ValueError(f"{obj.name}: trim anchor outside fabric at {x:.3f}, {z:.3f}")
        hit_point = world @ local
        return (hit_point.x,hit_point.y-relief,hit_point.z)

    return point


def hoodie(fabric, rib, seam, lining, gold):
    rows = TORSO + [(0,-.011,4.420,.154,.149),(0,-.015,4.443,.121,.123)]
    body = rings("Mint fleece with diagonal folds",stitched_rows(rows),fabric,
                 cap=False,sculpt=tailored_fold,smooth=1)
    surface = garment_front(body)
    pocket = [(3.438,.235),(3.467,.242),(3.530,.222),(3.613,.198),(3.658,.150)]
    count = 15
    vertices = []
    for j,(z,half) in enumerate(pocket):
        for k in range(count):
            fraction = 2*k/(count-1)-1
            puff = .019*(1-fraction*fraction)*sin(pi*j/(len(pocket)-1))
            vertices.append(surface(half*fraction,z,.011+puff))
    faces = [(j*count+i,j*count+i+1,(j+1)*count+i+1,(j+1)*count+i)
             for j in range(len(pocket)-1) for i in range(count-1)]
    mesh("Kangaroo pocket shaped over the fabric",vertices,faces,fabric,1)
    for side in (-1,1):
        strand("Bound pocket opening",
               [surface(side*(w-.010),z,.016) for z,w in pocket[1:]],.008,rib,
               radii=[.32,.88,1,.48])
        strand("Topstitch following the pocket",
               [surface(side*(w-.030),z+.006,.020) for z,w in pocket[1:-1]],.0034,seam,
               radii=[.20,1,.23])
        cord = [surface(side*x,z,relief) for x,z,relief in [
            (.102,4.312,.018),(.104,4.229,.036),(.096,4.079,.032),
            (.110,3.990+side*.029,.029)
        ]]
        x,y,z = cord[0]
        sphere("Hood eyelet rim",(x,y+.008,z),(.019,.010,.017),rib)
        strand("Cotton drawcord",cord,.0085,lining,radii=[.64,1,.94,.77])
        x,y,z = cord[-1]
        sphere("Drawcord cap",(x,y,z-.012),(.010,.010,.022),gold)
    strand("Pocket lower seam",[surface(x,3.445,.013) for x in (-.23,-.115,0,.115,.23)],
           .005,rib,radii=[.35,.9,1,.9,.35])
    flower("Hoodie blossom embroidery",*surface(.283,3.971,.009),.032,seam,lining)

    sleeves(fabric,rib)
    rows = [(0,.042,3.253,.397,.243),(0,.043,3.273,.421,.264),
            (0,.040,3.390,.430,.268),(0,.041,3.430,.409,.248)]
    rings("Rib-knit waistband",rows,rib,cap=False)
    for a in (i*pi/27 for i in range(-12,13)):
        strand("Waistband ribs",[(rx*sin(a),y-ry*cos(a)-.002,z)
               for _,y,z,rx,ry in rows[1:-1]],.0035,rib)

    ring = [(0,.066,4.22,.271,.234),(0,.086,4.33,.269,.235),
            (0,.115,4.454,.272,.225),(0,.13,4.496,.240,.207)]
    rings("Folded hood behind neck",ring,fabric,start=.64,stop=2*pi-.64,cap=False)
    strand("Bound hood edge",[(.219,-.039,4.447),(.138,-.131,4.443),
           (0,-.157,4.400),(-.138,-.131,4.443),(-.219,-.039,4.450)],.020,rib)


def coat(fabric, lapel, inner, gold, thread):
    rows = [(x,y,z,w*.93,d*.95) for x,y,z,w,d in TORSO] + [
        (0,-.008,4.433,.158,.147),(0,-.016,4.467,.131,.131)]
    rings("Cream knit with pressed neckline", stitched_rows(rows), inner, cap=False,
          sculpt=tailored_fold, smooth=1)
    rings("Folded knit collar around neck", [(0,-.016,4.446,.155,.147),
          (0,-.016,4.474,.139,.140),(0,-.017,4.504,.130,.127),
          (0,-.017,4.509,.115,.116)], inner, cap=False, smooth=1)
    rows = [
        (0,.067,2.13,.672,.473),(0,.067,2.158,.674,.477),(0,.069,2.305,.659,.461),
        (0,.062,2.64,.609,.390),(0,.053,3.01,.528,.336),(0,.043,3.39,.464,.301),
        (0,.053,3.65,.424,.283),(0,.051,3.926,.508,.319),(0,.029,4.174,.527,.275),
        (0,.024,4.284,.510,.241),(0,.023,4.356,.417,.219),(0,.014,4.440,.214,.173)
    ]
    def coat_fold(point, angle):
        x,y,z = tailored_fold(point, angle, .44)
        flex = max(0,min(1,(3.5-z)/1.48))
        wave = (.042*sin(5*angle+.55) + .018*sin(10*angle))*flex
        sweep = (.071+.080*sin(angle-.46))*flex*flex
        return x+sin(angle)*wave-sweep*.52, y-cos(angle)*wave+sweep, z

    obj = rings("Tailored night coat with draped skirt", stitched_rows(rows), fabric,
                start=.42, stop=2*pi-.42, cap=False, sculpt=coat_fold, smooth=1)
    thickness = obj.modifiers.new("Visible hem and lining", "SOLIDIFY")
    thickness.thickness = .021
    profile = [(z,x,y,w,d) for x,y,z,w,d in rows]

    def seam_at(angle,z,relief=0):
        x,y,w,d = interpolate(profile,z)
        surface = coat_fold((x+w*sin(angle),y-d*cos(angle),z),angle)
        return (surface[0],surface[1]-relief,surface[2])

    def folded_at(x,z,relief=0):
        cx,_,w,_ = interpolate(profile,z)
        return seam_at(asin(max(-1,min(1,(x-cx)/w))),z,relief)

    sleeves(fabric,lapel,gold)
    for side in (-1,1):
        # Narrow at the collar, with a short hard notch before the long lapel.
        pattern = [(.101,4.438),(.276,4.312),(.226,4.216),(.334,4.186),
                   (.241,3.990),(.157,3.740),(.130,3.790),(.118,3.990),(.107,4.292)]
        path = [folded_at(side*x,z,.023 if i in (1,3,4) else .014)
                for i,(x,z) in enumerate(pattern)]
        inset_panel("Notched folded lapel",path,lapel,.015)
        stroke = [(x,y-.006,z) for x,y,z in path[:6]]
        strand("Notch and lapel topstitch",stroke,.0055,thread,handles="VECTOR",
               radii=[.23,.85,.90,1,.74,.13])
        strand("Bound coat opening",[seam_at(side*.425,z,.005)
               for z in (3.754,3.54,3.26,2.93,2.60,2.34,2.157)],.009,lapel,
               radii=[.4,.85,.96,1,.91,.83,.30])
        for angle,z in ((.55,3.482),(.57,3.223),(.59,2.966)):
            x,y,z = seam_at(side*angle,z,.017)
            sphere("Engraved brass button rim",(x,y,z),(.039,.014,.042),gold)
            sphere("Brass button inset",(x,y-.010,z),(.026,.008,.028),lapel)
            sphere("Brass button center",(x,y-.016,z),(.011,.005,.012),gold)
        flap = [seam_at(side*a,z,.017 if j<2 else .021) for j,(a,z) in enumerate(
                ((.70,3.062),(1.03,3.100),(1.10,2.973),(.73,2.943)))]
        inset_panel("Tailored pocket flap",flap,lapel,.012)
        strand("Pocket flap perimeter",[(x,y-.005,z) for x,y,z in flap+[flap[0]]],
              .0042,thread,handles="VECTOR")
        x,y,z = seam_at(side*.86,2.999,.026)
        sphere("Pocket flap fastening",(x,y,z),(.023,.010,.024),gold)


def footwear(name, leather, outsole, trim, lace):
    boot = name == "boots"
    binding = trim if boot else material("Canvas trim","b5a197",.73,cloth=True)
    for side in (-1,1):
        before = set(bpy.context.scene.objects)
        x, offset = low_position(side)
        offset+=.103
        def raised_arch(y,z):
            if not boot:
                return z
            t = max(0,min(1,(y-offset+.415)/.53))
            return z+.173*t*t*(3-2*t)*max(0,min(1,(.67-z)/.50))

        def profile(point, angle):
            px,y,z = point
            width = .91 + .067*(1-cos(angle)) if boot else 1
            collar_dip = max(0,cos(angle))**5 * max(0,(z-.80)/.19) * .105 if boot else 0
            return x+(px-x)*width, y, raised_arch(y,z)-collar_dip

        def shape(rows, label, mat, cap=True, carved=True):
            return rings(label, [(x,y+offset,z,w,d) for z,y,w,d in rows], mat, cap=cap,
                         sculpt=profile if carved else None)

        if boot:
            shape([(.079,.121,.081,.079),(.107,.123,.092,.082),(.154,.128,.093,.080),
                   (.259,.112,.114,.086),(.300,.098,.116,.090)],"Champagne heel block",trim,carved=False)
            shape([(.079,.123,.083,.084),(.105,.121,.091,.084),(.118,.121,.090,.083)],
                  "Heel rubber cap",outsole,carved=False)
        shape([(.084,-.175,.196,.390),(.111,-.186,.205,.402),(.159,-.187,.209,.408),(.180,-.184,.200,.398)],"Carved heel and sole",outsole)
        rows = [
            (.151,-.178,.199,.401),(.174,-.172,.205,.405),(.249,-.172,.205,.391),
            (.310,-.201,.191,.358),(.373,-.163,.173,.300),(.436,-.071,.158,.216),
            (.525,-.011,.168,.157),(.591,.012,.168,.157)
        ]
        if boot:
            rows += [(.662,.026,.181,.161),(.755,.042,.186,.167),(.876,.055,.205,.181),(.982,.088,.202,.181)]
        else:
            rows += [(.633,.007,.172,.162)]
        shape(rows, "Ivory leather boot" if boot else "Oat canvas sneaker", leather, cap=False)
        z,cy,rx,ry = rows[-1]
        band = .038 if boot else .052
        shape([(z-band,cy-.002,rx+.007,ry+.006),(z-band+.012,cy,rx+.013,ry+.010),
              (z-.004,cy,rx+.014,ry+.011),(z+.006,cy,rx+.006,ry+.005)],
              "Open padded shoe collar",binding,cap=False)
        pts = [profile((x+.207*sin(a),offset-.183-.402*cos(a),.155),a)
               for a in (i*2*pi/48 for i in range(49))]
        strand("Welt stitch",pts,.0062,binding)

        def upper(a,z,relief=.012):
            y,w,d = interpolate(rows,z)
            return profile((x+(w+relief)*sin(a),offset+y-(d+relief)*cos(a),z),a)

        if boot:
            for half in (-1,1):
                strand("Pointed toe embroidery", [upper(half*a,z,.011)
                       for a,z in ((0,.205),(.18,.230),(.37,.290),(.57,.318),(.75,.330))],
                       .007,trim,radii=[.23,.82,1,.70,.09])
            # Build the leather facing on the boot last so the lower edge
            # curves around the ankle and stays under the raised straps.
            tongue = [upper(a,z,.008) for a,z in [
                (-.72,.622),(-.71,.83),(-.46,.894),(0,1.006),(.46,.894),(.71,.83),(.72,.622),(0,.603)]]
            inset_panel("Pointed leather tongue",tongue,leather,.009)
            for side_offset in (-1,1):
                strand("Embossed tongue edge",
                       [upper(side_offset*a,z,.017) for a,z in ((.686,.665),(.693,.816),
                               (.47,.881),(.18,.951),(0,.986))],
                       .0044,trim,radii=[.26,.92,1,.87,.35])
            for direction in (-1,1):
                strap = [upper(a,.735+direction*a*.103,.024)
                         for a in (-1.09,-.66,-.26,.0,.27,.66,1.09)]
                strand("Gilded crossed boot strap",strap,.013,trim,radii=[.4,.93,1,1,1,.93,.4])
            points = [(x+(.114 if i%2==0 else .039)*sin(i*pi/4),offset-.192,
                       .728+(.125 if i%2==0 else .043)*cos(i*pi/4)) for i in range(8)]
            inset_panel("Four-point engraved star", points, trim, .015)
            sphere("Enamel on boot star",(x,offset-.214,.728),(.031,.016,.039),lace)
            strand("Pendant chain",[(x,offset-.198,.680),(x+.022,offset-.239,.617),
                  (x+.014,offset-.256,.564)],.008,trim)
            jewel = sphere("Lilac boot pendant",(x+.014,offset-.262,.550),(.024,.014,.042),lace)
            jewel.rotation_euler.y = -.20
            for side_offset in (-1,1):
                for i in range(3):
                    sphere("Embossed toe stitch",upper(side_offset*(.29+i*.18),.254+i*.030,.011),
                           (.006,.006,.007),trim)
        else:
            levels = (.310,.356,.410,.463)
            for edge in (-1,1):
                strand("Stitched canvas eyelet facing",
                       [upper(edge*a,z,.009) for a,z in ((.45,.294),(.46,.344),(.47,.405),(.50,.466),(.45,.505))],
                       .006,binding,radii=[.24,.9,1,.88,.24])
                for z in levels:
                    sphere("Stitched eyelet",upper(edge*.38,z,.013),(.013,.009,.012),binding)
            for j,z in enumerate(levels[:-1]):
                for lead in (-1,1):
                    end = levels[j+1]
                    cross = [upper(lead*.38,z,.018),upper(0,(z+end)/2,.024),
                             upper(-lead*.38,end,.018)]
                    strand("Crossed cotton lace",cross,.007+(.001 if lead==1 else 0),lace)
            bow = upper(0,.478,.023)
            for edge in (-1,1):
                loop = [bow,upper(edge*.27,.507,.043),upper(edge*.49,.495,.031),
                        upper(edge*.32,.468,.032),bow,upper(edge*.32,.420,.015)]
                strand("Tied cotton bow",loop,.008,lace,radii=[1,.86,.96,.91,1,.42])
                strand("Toe-cap stitches",
                       [upper(edge*a,z,.009) for a,z in ((0,.214),(.28,.220),(.54,.234),(.81,.255),(1.04,.268))],
                       .004,binding,radii=[.32,.83,.95,.80,.20])

        mark_region(before, "leg", side)


def mark_region(before, region, side=None):
    for obj in set(bpy.context.scene.objects)-before:
        obj["studio_region"] = region
        if side is not None:
            obj["studio_side"] = side


def fit_pose():
    """Move the shared figure and all costume variants to the same stance."""
    bpy.context.view_layer.update()
    for obj in bpy.context.scene.objects:
        if obj.type not in ("MESH", "CURVE"):
            continue
        world = obj.matrix_world.copy()
        local = world.inverted()
        is_arm = obj.name.startswith(("Wrist", "Relaxed finger", "Curved thumb",
                                     "Separately fitted sleeve", "Soft sleeve fold",
                                     "Finished wrist cuff", "Cuff saddle", "Working sleeve"))
        is_head = any(group.name.startswith(("Peach complexion", "Hair |", "Cream beret"))
                      for group in obj.users_collection)

        def moved(co):
            x,y,z = world @ co
            if is_head:
                # Slight tilt at the neck, with the hat rigged to the hair.
                tx, tz = x*.91, (z-4.60)*.96
                x = tx*cos(.033)-tz*sin(.033)-.074
                z = 4.60 + tx*sin(.033)+tz*cos(.033)
            elif z > 2.25:
                x += interpolate([(2.25, 0),(2.66,.028),(3.10,.085),(3.48,.052),
                                  (4.03,-.04),(4.60,-.074)],z)[0]
            if is_arm:
                t = max(0,min(1,(4.22-z)/1.25))
                if x > 0:
                    x -= .093*t
                    y -= .118*t
                    z += .050*t
                else:
                    x -= .014*t
                    y += .036*t
            if z <= 2.75 and not is_arm:
                t = max(0,min(1,(2.75-z)/1.75))
                side = 1 if x >= 0 else -1
                anchor_x,anchor_y = low_position(side)
                a = -.18*side*max(0,min(1,(1.40-z)/.70))
                px,py = x-anchor_x, y-(anchor_y+.12)
                x = anchor_x + cos(a)*px-sin(a)*py
                y = anchor_y + .12 + sin(a)*px+cos(a)*py
                x += t*(.045 if side < 0 else .075)
                y -= t*(.105 if side < 0 else -.085)
            return local @ Vector((x,y,z))

        if obj.type == "MESH":
            for vertex in obj.data.vertices:
                vertex.co = moved(vertex.co)
        else:
            for spline in obj.data.splines:
                for point in spline.bezier_points:
                    point.co = moved(point.co)


# Landmarks in the 680 × 1060 orthographic render. The wardrobe artwork
# was aligned to the baseline render at the (uncovered) crown and soles.
# The first two values in each row are the old and fitted screen heights.
# Torso rows also have a centre shift and width factor.
TORSO_FIT = [
    (208, 185, 0, .86), (247, 218, 0, .88), (278, 248, 1, .92),
    (308, 278, 1, .95), (346, 318, 9, 1.035), (376, 351, 15, 1.05),
    (412, 388, 18, .97), (438, 419, 14, .90), (460, 460, 10, 1.12),
    (489, 508, 10, 1.27), (527, 545, 10, 1.21), (582, 591, 10, 1.13),
    (624, 627, 7, 1.07), (690, 691, 0, 1), (770, 770, 0, 1),
]
# Arm rows add a horizontal shift from the original 3D silhouette. At
# the sleeve head the arm follows the torso to keep the shoulder closed.
ARM_FIT = {
    -1: [(296, 271, 4), (345, 334, 14), (391, 394, 10),
         (435, 436, -6), (479, 481, -22), (511, 521, -36), (570, 588, -40)],
     1: [(296, 269, -8), (346, 319, -21), (396, 389, -22),
         (437, 443, -29), (479, 509, -33), (526, 568, -16), (554, 593, -14)],
}
# Each leg has its own projected centre and knee/calf width. Taper below
# the knees and move the free ankle outward, as in the illustrated pose.
LEG_FIT = {
    -1: [(598, 601, 299, 301, 1.02), (640, 643, 299, 306, .99),
         (693, 694, 298, 295, .80), (722, 719, 299, 284, .80),
         (754, 761, 296, 261, .99), (801, 805, 292, 241, .92),
         (846, 873, 289, 229, .75), (880, 907, 287, 222, .82),
         (925, 943, 286, 220, .84), (1016, 1016, 286, 221, .88)],
     1: [(598, 601, 378, 391, 1.04), (640, 645, 378, 392, 1.00),
         (696, 697, 378, 391, .79), (726, 730, 379, 390, .81),
         (759, 770, 376, 385, .92), (810, 824, 375, 383, .92),
         (854, 893, 374, 380, .86), (889, 918, 374, 380, .88),
         (925, 948, 374, 381, .90), (1016, 1016, 374, 382, .94)],
}

# Projected landmarks after the reference pose is fitted. Lift the waist
# and inseam, keeping the shoes grounded and the knee bend gradual.
SILHOUETTE_HEIGHTS = [
    (185, 176), (248, 236), (310, 300), (374, 358),
    (445, 424), (510, 482), (562, 529), (628, 583), (660, 613),
    (707, 686), (797, 784), (898, 895), (1016, 1016), (1060, 1060),
]


def smooth_range(value, start, end):
    t = max(0, min(1, (value-start)/(end-start)))
    return t*t*(3-2*t)


def smooth_profile(rows):
    """Interpolate fitting landmarks without creases at the joined levels."""
    heights = [row[0] for row in rows]
    spans = [b-a for a,b in zip(heights, heights[1:])]
    columns = list(zip(*(row[1:] for row in rows)))
    tangents = []
    for values in columns:
        slopes = [(b-a)/h for a,b,h in zip(values, values[1:], spans)]
        inner = [0 if a*b <= 0 else 2*a*b/(a+b) for a,b in zip(slopes, slopes[1:])]
        tangents.append([slopes[0], *inner, slopes[-1]])

    def sample(height):
        if height <= heights[0]:
            return rows[0][1:]
        if height >= heights[-1]:
            return rows[-1][1:]
        i = bisect_right(heights, height)-1
        h = spans[i]
        t = (height-heights[i])/h
        blend = t*t*(3-2*t)
        return tuple(v[i]*(1-blend)+v[i+1]*blend
                     +h*t*(1-t)*(m[i]*(1-t)-m[i+1]*t)
                     for v,m in zip(columns, tangents))

    return sample


def fit_reference_pose(scene):
    """Refit the model in the illustration camera, then keep the new 3D mesh."""
    view = scene.camera.matrix_world.copy()
    inverse = view.inverted()
    corners = scene.camera.data.view_frame(scene=scene)
    left, right = min(p.x for p in corners), max(p.x for p in corners)
    bottom, top = min(p.y for p in corners), max(p.y for p in corners)
    px = 680/(right-left)
    py = 1060/(top-bottom)
    body = smooth_profile(TORSO_FIT)
    arms = {side: smooth_profile(rows) for side,rows in ARM_FIT.items()}
    legs = {side: smooth_profile(rows) for side,rows in LEG_FIT.items()}
    silhouette_height = smooth_profile(SILHOUETTE_HEIGHTS)

    def screen(point):
        p = inverse @ point
        return (p.x-left)*px, (top-p.y)*py, p.z

    def refit(point, region, side):
        x,y,depth = screen(point)
        if region == "head":
            # Keep the face, hair and hat in the same fitting group.
            return view @ Vector((left+(340+(x-340)*.731)/px,
                                  top-(97+(y-97)*.710)/py, depth))
        y_fit, shift, width = body(y)
        x_fit = 340+(x-340)*width+shift
        axis_fit = 340+shift
        if region == "arm":
            t = smooth_range(y,312,368)
            arm_y,arm_shift = arms[side](y)
            x_fit = x_fit*(1-t) + (x+arm_shift)*t
            y_fit = y_fit*(1-t) + arm_y*t
        elif region == "leg":
            t = smooth_range(y,585,639)
            leg_y,axis,new_axis,scale = legs[side](y)
            # Pivot each shoe and trouser leg about the same real ankle
            # before setting the stance. The right toe opens outward.
            turn = (-.62 if side == -1 else .55)*smooth_range(y,849,937)
            ankle_x,ankle_y = low_position(side)
            ankle_x += .045 if side==-1 else .075
            ankle_y += .015 if side==-1 else .205
            dx,dy = point.x-ankle_x,point.y-ankle_y
            turned = Vector((ankle_x+dx*cos(turn)-dy*sin(turn),
                             ankle_y+dx*sin(turn)+dy*cos(turn),point.z))
            foot_x,foot_y,foot_depth = screen(turned)
            x_fit = x_fit*(1-t) + (new_axis+(foot_x-axis)*scale)*t
            y_fit = y_fit*(1-t) + (leg_y+foot_y-y)*t
            axis_fit = axis_fit*(1-t)+new_axis*t
            depth += (foot_depth-depth)*t
        elif region == "coat":
            # Give the front of the skirt ease over the bent thigh. The
            # back cloth still hangs behind the legs in the same 3D view.
            facing = 1-smooth_range(point.y,.01,.24)
            depth += .16*facing*smooth_range(y,546,632)
        taper = smooth_range(y_fit,335,486)*(1-smooth_range(y_fit,658,814))
        if region == "arm":
            taper *= 1-smooth_range(y,312,368)
        width_factor = 1-.052*taper
        if region == "leg":
            width_factor -= .06*smooth_range(y_fit,891,985)
        x_fit = axis_fit+(x_fit-axis_fit)*width_factor
        lifted, = silhouette_height(y_fit)
        if region == "arm":
            # Let the bent elbows and wrists hang at their original reach.
            lifted += (y_fit-6-lifted)*smooth_range(y,330,545)
        return view @ Vector((left+x_fit/px,top-lifted/py,depth))

    bpy.context.view_layer.update()
    for obj in scene.objects:
        if obj.type not in ("MESH","CURVE"):
            continue
        world = obj.matrix_world.copy()
        local = world.inverted()
        if any(group.name.startswith(("Peach complexion", "Hair |", "Cream beret"))
               for group in obj.users_collection):
            region = "head"
        else:
            region = obj.get("studio_region","body")
            if region=="body" and any(group.name=="Night coat" for group in obj.users_collection):
                region = "coat"

        def moved(co):
            point = world @ co
            side = obj.get("studio_side",-1 if point.x < 0 else 1)
            return local @ refit(point,region,side)

        if obj.type == "MESH":
            for vertex in obj.data.vertices:
                vertex.co = moved(vertex.co)
        else:
            for spline in obj.data.splines:
                for point in spline.bezier_points:
                    point.co = moved(point.co)


def make_variant(name, callback, *args):
    before = set(bpy.context.scene.objects)
    callback(*args)
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    for obj in set(bpy.context.scene.objects)-before:
        for owner in list(obj.users_collection):
            owner.objects.unlink(obj)
        collection.objects.link(obj)
    return collection


def build():
    skin = material("Peach skin", "f1ae91", .58, surface="skin")
    gold = material("Champagne brass", "d7a363", .27, metal=.65)
    ivory = material("Oatmeal cloth", "edded0", cloth=True)
    sole = material("Soft cocoa rubber", "5c4756")
    lock = material("Painted lilac waves", "805391", .34, surface="hair")
    lock["painted_hair_masks"] = True
    pigment = lock.node_tree.nodes.new("ShaderNodeVertexColor")
    pigment.layer_name = "Lilac pigments"
    shader = lock.node_tree.nodes.get("Principled BSDF")
    lock.node_tree.links.new(pigment.outputs["Color"], shader.inputs["Base Color"])
    violet = (lock,material("Flyaway lilac","7f6794",.51,surface="hair"))
    head = make_variant("Peach complexion and facial features",face,skin,gold)
    hands(skin)
    hems = trousers(material("Indigo denim", "456385", cloth=True),
                   material("Faded denim cuff", "557696", cloth=True),
                   material("Deep indigo seam", "344960"),material("Canvas topstitch", "b2956f"))
    groups = {
        "hair":make_variant("Hair | airy lilac waves",hair,violet),
        "seat":make_variant("Hair | fitted to beret",hair,violet,True),
        "hat":make_variant("Cream beret",beret,ivory,material("Toasted wool edging","c9a991",cloth=True),gold),
        "hoodie":make_variant("Mint hoodie",hoodie,material("Sea-glass fleece","89b6a1", cloth=True),
            material("Mint rib knit","6c947e",cloth=True),material("Mint embroidery","bdd8bb"),ivory,gold),
        "coat":make_variant("Night coat",coat,material("Mulberry twill","653957",cloth=True),
            material("Violet collar","7d4b69",cloth=True),ivory,gold,material("Rose edge","a1748b")),
        "sneakers":make_variant("Low canvas shoes",footwear,"sneakers",ivory,sole,gold,material("Laces","fff0d3")),
        "boots":make_variant("Stardust boots",footwear,"boots",material("Ivory satin leather","ead2b5",.41,surface="leather"),
            sole,gold,material("Lilac enamel","76538b",.26))
    }
    for hem in hems:
        for collection in list(hem.users_collection):
            collection.objects.unlink(hem)
        groups["sneakers"].objects.link(hem)
    for collection in (head, groups["hair"], groups["seat"], groups["hat"]):
        for obj in collection.objects:
            obj.location.z -= .074
    return groups


def select(groups, *visible):
    for name, collection in groups.items():
        hidden = name not in visible
        collection.hide_render = hidden
        collection.hide_viewport = hidden


def main():
    args = command_line()
    args.output.mkdir(parents=True, exist_ok=True)
    scene = prepare_scene(args.draft)
    groups = build()
    style_materials()
    add_outline(scene,args.draft)
    fit_pose()
    fit_reference_pose(scene)
    select(groups, "hoodie", "hair", "boots")
    if args.blend:
        args.blend.parent.mkdir(parents=True, exist_ok=True)
        for screen in bpy.data.screens:
            for area in screen.areas:
                if area.type == "VIEW_3D":
                    area.spaces.active.region_3d.view_perspective = "CAMERA"
        bpy.ops.wm.save_as_mainfile(filepath=str(args.blend.resolve()))
    for name in args.outfit or OUTFITS:
        select(groups, *OUTFITS[name])
        scene.render.filepath = str((args.output/f"{name}.png").resolve())
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
