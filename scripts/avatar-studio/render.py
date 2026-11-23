"""Build the pose and render the Alchankki wardrobe study with Blender 4.3."""
import argparse
from math import asin, cos, exp, pi, sin
from pathlib import Path
import sys

import bpy
from mathutils import Vector


def command_line():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--blend", type=Path)
    parser.add_argument("--draft", action="store_true")
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:])


def linear(hex_color):
    values = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values]


def material(name, color, roughness=.58, *, metal=0, cloth=False):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*linear(color), 1)
    result.use_nodes = True
    nodes = result.node_tree.nodes
    links = result.node_tree.links
    shader = nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = result.diffuse_color
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metal
    if cloth:
        shader.inputs["Sheen Weight"].default_value = .21
        noise = nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 150
        noise.inputs["Detail"].default_value = 2
        grain = nodes.new("ShaderNodeTexNoise")
        grain.inputs["Scale"].default_value = 29
        grain.inputs["Detail"].default_value = 2.6
        tint = nodes.new("ShaderNodeValToRGB")
        tint.color_ramp.elements[0].color = tuple(c*.78 for c in result.diffuse_color[:3]) + (1,)
        tint.color_ramp.elements[1].color = tuple(min(1,c*1.135+.003) for c in result.diffuse_color[:3]) + (1,)
        links.new(grain.outputs["Fac"], tint.inputs[0])
        links.new(tint.outputs[0], shader.inputs["Base Color"])
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = .19
        bump.inputs["Distance"].default_value = .008
        links.new(noise.outputs["Fac"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], shader.inputs["Normal"])
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


def strand(name, points, radius, mat, *, radii=None, bevel=4):
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
        point.handle_left_type = point.handle_right_type = "AUTO"
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
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 18 if draft else 128
    scene.cycles.use_denoising = False
    scene.cycles.adaptive_threshold = .019
    scene.cycles.max_bounces = 5
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 3
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.file_format = "PNG"
    scene.render.resolution_x = 680
    scene.render.resolution_y = 1060
    scene.render.resolution_percentage = 55 if draft else 100
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -.13
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

    for name, where, power, size, color in [
        ("Apricot key", (-4, -6, 8), 655, 3.7, (1, .84, .73)),
        ("Lavender fill", (4, -5, 4.2), 235, 4, (.82, .86, 1)),
        ("Hair and shoulder rim", (1, 3, 7), 600, 3.4, (.97, .78, 1)),
    ]:
        bpy.ops.object.light_add(type="AREA", location=where)
        obj = bpy.context.object
        obj.name = name
        obj.data.energy, obj.data.size, obj.data.color = power, size, color
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
    nodes, links = paint.node_tree.nodes, paint.node_tree.links
    shader = nodes.get("Principled BSDF")
    shader.inputs["Specular IOR Level"].default_value = .23
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
    links.new(mix.outputs[0], shader.inputs["Emission Color"])
    shader.inputs["Emission Strength"].default_value = .42
    return paint, image.image.size[:]


def face(skin, gold):
    paint, (width, height) = painted_face_material(skin)
    count, levels = 112, 84
    vertices, uvs, coverage = [], [], []
    for j in range(levels):
        v = 4 + (452-4)*j/(levels-1)
        left, right, thick = interpolate(FACE_SECTIONS, v)
        for k in range(count):
            a = k*2*pi/count
            u = (right+left)/2 + sin(a)*(right-left)/2
            frontal = max(0, cos(a))
            nose = .084*exp(-((u-269)/27)**2 - ((v-316)/33)**2)
            cheek = .032*exp(-((u-141)/50)**2 - ((v-295)/50)**2)
            orbital = -.026*exp(-((u-165)/58)**2 - ((v-248)/33)**2)
            d = thick*cos(a) + (nose+cheek+orbital)*frontal
            if v>398:
                d += .097*(v-398)/54
            vertices.append(portrait_point((u-181)*.00228, d, 5.663-v*.00222))
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

    ear = sphere("Visible ear", portrait_point(-.318,.113,5.042), (.104,.062,.125), skin)
    ear.rotation_euler.z = -PORTRAIT_YAW
    inset = material("Ear warm shade", "bb7565", .72)
    ear_shape = sphere("Ear concha", portrait_point(-.347,.164,5.033), (.044,.017,.067), inset)
    ear_shape.rotation_euler.z = -PORTRAIT_YAW
    sphere("Small gold earring", portrait_point(-.315,.173,4.959), (.025,.021,.025), gold)


def hair_lock(name, rows, mat, shade, tone, shine):
    count = 34
    path = [portrait_point(x,depth,z) for x,depth,z,_,_ in rows]
    vertices, colors = [], []
    for j, (center,row) in enumerate(zip(path,rows)):
        t = j/(len(rows)-1)
        tangent = (path[min(j+1,len(path)-1)]-path[max(0,j-1)]).normalized()
        across = tangent.cross(PORTRAIT_FRONT).normalized()
        normal = across.cross(tangent).normalized()
        for k in range(count):
            a = k*2*pi/count
            mid = sin(a)
            facing = cos(a)
            fine = (sin(23*mid+7*t)+sin(40*mid-4*t))*.0024
            depth = facing*(row[4]+fine) + .009*exp(-((mid+.26)/.25)**2)*max(0,facing)
            vertices.append(center + across*(row[3]*mid) + normal*depth)
            light = .13 + .76*max(0,facing)**.56
            sheen = (.27*exp(-((mid+.26)/.28)**2) +
                     .17*exp(-((mid-.38)/.15)**2)) * max(0,facing)
            sheen *= .58+.42*cos(15*t+mid)**2
            shade_variation = .068*cos(31*mid-8*t)*max(0,facing)
            colors.append(tuple(d+(b-d)*light+(s-b)*sheen+shade_variation*(b-d)
                                for d,b,s in zip(shade,tone,shine)))
    faces = [tuple(reversed(range(count)))]
    for j in range(len(rows)-1):
        for k in range(count):
            n = (k+1)%count
            faces.append(tuple(j*count+i for i in (k,n,n+count,k+count)))
    faces.append(tuple(range(len(vertices)-count,len(vertices))))
    obj = mesh(name, vertices, faces, mat, 2)
    color_attributes(obj, "Lilac pigments", colors)
    return obj


def hair(materials, hatted=False):
    base, lock, fine = materials
    deep, violet, orchid, silver = [linear(c) for c in ("392644","714582","9569ac","e6cafa")]
    def sculpt(label, rows, pale=False):
        hair_lock(label, rows, lock, deep, orchid if pale else violet, silver)

    vertices, faces = [], []
    count = 72
    for j in range(25):
        for k in range(count):
            a = k*2*pi/count
            reach = 1.02 + 1.30*((1-cos(a))/2)**.62
            t = .012 + (reach-.012)*j/24
            top = 5.205 + .49*cos(t)
            if hatted:
                top = min(top, 5.58+.18*(top-5.58))
            vertices.append(portrait_point(.483*sin(t)*sin(a),
                    .453*sin(t)*cos(a)-.058, top))
    faces.append(tuple(range(count)))
    for j in range(24):
        for k in range(count):
            n = (k+1)%count
            faces.append(tuple(j*count+i for i in (k,k+count,n+count,n)))
    mesh("Dark lilac scalp and back volume", vertices, faces, base, 1)

    # Each lock moves over and under the adjacent curl at different heights.
    # All roots overlap the rear shell, leaving the cheek and jaw in front.
    profiles = [
       [(.28,.03,5.52,.078,.047),(.48,.02,5.29,.119,.068),(.51,.05,5.00,.123,.065),
        (.44,.10,4.82,.122,.064),(.48,.13,4.68,.112,.068),(.65,.16,4.53,.111,.059),
        (.71,.13,4.37,.090,.051),(.60,.13,4.21,.049,.033),(.50,.18,4.20,.002,.003)],
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
    for side in (-1,1):
        for i, profile in enumerate(profiles):
            rows = [(side*x + (.113*exp(-((z-5.152)/.253)**2)-.014 if side==1 else 0),
                     d+(.012 if side==1 else 0),
                     z + ((.035 if i%2 else .09) if side==1 and j>2 else 0),
                     w,dz) for j,(x,d,z,w,dz) in enumerate(profile)]
            sculpt("Layered S-wave", rows, i in (1,3))
        # A thin loop catches light outside the largest wave.
        strand("Fine escaping hair", [portrait_point(side*x,d,z) for x,d,z in
               [(.49,.12,5.06),(.57,.09,4.88),(.73,.15,4.71),(.77,.20,4.56),
                (.70,.24,4.49),(.59,.27,4.56)]], .011, fine,
               radii=[.04,1,.83,.66,.50,.03])

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
        if i>=2:
            raw = [(x+.066*max(0,min(1,(5.49-z)/.20)),d,z,w*(.87 if j>2 else 1),depth)
                   for j,(x,d,z,w,depth) in enumerate(raw)]
        if hatted:
            raw = [(x,d-.128 if j<3 else d,z-(.137 if j<3 else .012),
                    w*(.84 if j<2 else 1),depth) for j,(x,d,z,w,depth) in enumerate(raw)]
        sculpt("Tapered side-swept fringe", raw, i in (0,2))


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
        bend = (.033*sin(6*angle+3*z) + .014*sin(11*angle-9*z))*f
        return x+bend*sin(angle), y-bend*cos(angle), z-x*.115+bend*.27

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
    pieces, turned_hems = [], []

    def knee_fold(point, a):
        x,y,z = point
        v = (z-1.63+.15*sin(a))/.063
        d = .016*(exp(-v*v)-.67*exp(-(v-1.2)**2))*max(0,cos(a))
        return x+d*sin(a), y-d*cos(a), z
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
        (0,.07,2.99,.440,.241),(0,.07,3.17,.418,.229),(0,.07,3.27,.409,.220)],denim))
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
    for side in (-1,1):
        strand("Denim pocket topstitch",[(side*x,y,z) for x,y,z in
               ((.143,-.142,3.211),(.181,-.141,3.161),(.240,-.130,3.134),(.294,-.111,3.125))],
               .0046,stitches,radii=[.25,1,.94,.37])
    strand("Denim fly topstitch", [(.020,-.163,3.26),(.026,-.180,3.127),
           (.038,-.185,2.993),(.078,-.184,2.907)], .005, stitches)
    return turned_hems


def hands(skin):
    for side in (-1, 1):
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
    rings("Neck on shared pose", [(0,.015,4.25,.187,.165),(0,-.007,4.40,.164,.161),
          (0,-.028,4.60,.148,.150),(0,-.039,4.79,.202,.177)],skin)


TORSO = [
    (0,.044,3.28,.405,.255),(0,.045,3.38,.420,.260),(0,.061,3.63,.382,.235),
    (0,.052,3.85,.431,.275),(0,.047,4.062,.474,.288),(0,.025,4.22,.473,.246),
    (0,.014,4.319,.441,.215),(0,-.003,4.355,.324,.208),(0,-.004,4.394,.204,.171)
]


def sleeves(fabric, cuff, trim=None):
    for side in (-1,1):
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


def hoodie(fabric, rib, seam, lining, gold):
    rings("Mint fleece with diagonal folds", stitched_rows(TORSO), fabric, cap=False,
          sculpt=tailored_fold, smooth=1)
    sleeves(fabric, rib)
    rows = [(0,.042,3.253,.397,.243),(0,.043,3.273,.421,.264),(0,.040,3.403,.430,.268),(0,.041,3.441,.409,.248)]
    rings("Rib-knit waistband", rows, rib, cap=False)
    for a in (i*pi/27 for i in range(-12,13)):
        strand("Waistband ribs",[(rx*sin(a),y-ry*cos(a)-.002,z)
               for _,y,z,rx,ry in rows[1:-1]],.004,rib)

    ring = [(0,.066,4.22,.271,.234),(0,.086,4.33,.269,.235),(0,.115,4.454,.272,.225),(0,.13,4.496,.240,.207)]
    rings("Folded hood behind neck", ring, fabric, start=.64, stop=2*pi-.64, cap=False)
    strand("Bound hood edge", [(.219,-.039,4.447),(.160,-.168,4.398),(0,-.186,4.340),(-.158,-.168,4.400),(-.219,-.039,4.450)],.035,rib)
    inset_panel("Kangaroo pocket", [(-.234,-.170,3.391),(-.198,-.201,3.506),(-.157,-.220,3.627),
          (0,-.203,3.676),(.157,-.220,3.627),(.198,-.201,3.506),(.234,-.170,3.391),(0,-.234,3.396)], fabric,.020)
    for side in (-1,1):
        strand("Double topstitch of pocket",[(side*.234,-.177,3.397),(side*.213,-.200,3.492),
              (side*.176,-.226,3.602),(side*.158,-.222,3.622)],.006,seam)
        strand("Cotton drawcord",[(side*.115,-.204,4.357),(side*.118,-.254,4.240),
              (side*.098,-.269,4.102),(side*.128,-.253,3.974+side*.028)],.011,lining)
        sphere("Drawcord tip",(side*.128,-.253,3.956+side*.028),(.014,.013,.034),gold)
    flower("Hoodie blossom embroidery", .315,-.152,3.99,.044,seam,lining)


def coat(fabric, lapel, inner, gold, thread):
    rows = [(x,y,z,w*.93,d*.95) for x,y,z,w,d in TORSO] + [
        (0,-.002,4.433,.166,.157),(0,-.021,4.452,.163,.157)]
    rings("Cream knit with pressed neckline", stitched_rows(rows), inner, cap=False,
          sculpt=tailored_fold, smooth=1)
    rings("Folded knit collar around neck", [(0,-.020,4.420,.169,.159),
          (0,-.021,4.453,.170,.159),(0,-.023,4.482,.164,.157),
          (0,-.023,4.487,.143,.143)], inner, cap=False, smooth=1)
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
    sleeves(fabric,lapel,gold)
    for side in (-1,1):
        path = [(side*.101,-.154,4.453),(side*.302,-.162,4.292),(side*.252,-.222,4.169),
                (side*.357,-.199,4.159),(side*.239,-.306,3.922),(side*.167,-.246,3.709),
                (side*.119,-.225,3.766),(side*.142,-.230,3.996),(side*.109,-.184,4.290)]
        inset_panel("Folded coat lapel", path, lapel, .022)
        strand("Lapelled rose edging",[(x,y-.014,z) for x,y,z in path[:7]],.009,thread,
               radii=[.33,.8,.83,.86,.68,.47,.1])
        def surface(x, z, relief=.0):
            y, w, d = interpolate([(z,y,w,d) for _,y,z,w,d in rows], z)
            a = asin(max(-1,min(1,x/w)))
            return coat_fold((x,y-d*cos(a),z),a)[1] - relief

        binding = []
        for x,z in [(.167,3.71),(.203,3.51),(.210,3.20),(.234,2.82),(.261,2.43),(.279,2.15)]:
            binding.append((side*x,surface(x,z,.009),z))
        strand("Front opening edge", binding, .012, lapel)
        for x,z in ((.237,3.482),(.262,3.223),(.294,2.966)):
            y = surface(x,z,.021)
            sphere("Brass coat button rim",(side*x,y,z),(.053,.026,.054),gold)
            sphere("Recessed engraved button",(side*x,y-.022,z),(.033,.011,.034),lapel)
            sphere("Button centre",(side*x,y-.034,z),(.016,.007,.016),gold)
        flap = [(side*x,surface(x,z,.021),z) for x,z in [
            (.345,2.976),(.468,3.019),(.480,2.915),(.363,2.875)]]
        inset_panel("Coat pocket flap",flap,lapel,.013)
        strand("Pocket piping",[(x,y-.011,z) for x,y,z in flap[:2]],.008,thread)



def footwear(name, leather, outsole, trim, lace):
    boot = name == "boots"
    for side in (-1,1):
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
              "Open padded shoe collar",trim,cap=False)
        pts = [profile((x+.207*sin(a),offset-.183-.402*cos(a),.155),a)
               for a in (i*2*pi/48 for i in range(49))]
        strand("Welt stitch",pts,.0075,trim)
        if boot:
            def upper(a,z,relief=.012):
                y,w,d = interpolate(rows,z)
                return profile((x+(w+relief)*sin(a),offset+y-(d+relief)*cos(a),z),a)

            for half in (-1,1):
                strand("Pointed toe embroidery", [upper(half*a,z,.011)
                       for a,z in ((0,.205),(.18,.230),(.37,.290),(.57,.318),(.75,.330))],
                       .007,trim,radii=[.23,.82,1,.70,.09])
            # Build the leather facing on the boot last so the lower edge
            # curves around the ankle and stays under the raised straps.
            tongue = [upper(a,z,.008) for a,z in [
                (-.72,.622),(-.71,.83),(-.46,.894),(0,1.006),(.46,.894),(.71,.83),(.72,.622),(0,.603)]]
            inset_panel("Pointed leather tongue", tongue, leather, .009)
            for direction in (-1,1):
                strap = [upper(a,.735+direction*a*.103,.024)
                         for a in (-1.09,-.66,-.26,.0,.27,.66,1.09)]
                strand("Gilded crossed boot strap",strap,.017,trim,radii=[.5,.91,1,1,1,.91,.5])
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
            for i in range(4):
                z, y = .346+i*.053, offset-.394+i*.056
                for t in (-1,1):
                    sphere("Brass eyelet",(x+t*.098,y,z),(.023,.015,.016),trim)
                strand("Fine cotton lacing",[(x-.099,y-.011,z),(x-.019,y-.014,z+.006),
                       (x+.044,y+.006,z+.028),(x+.1,y+.029,z+.035)],.011,lace)
            for t in (-1, 1):
                strand("Lace bow",[(x,offset-.246,.532),(x+t*.069,offset-.241,.568),
                      (x+t*.135,offset-.232,.579),(x+t*.091,offset-.266,.531),
                      (x,offset-.253,.529),(x+t*.097,offset-.315,.486)],.012,lace)


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
    skin = material("Peach skin", "efac8e", .58)
    skin.node_tree.nodes.get("Principled BSDF").inputs["Subsurface Weight"].default_value = .07
    gold = material("Champagne brass", "d7a363", .27, metal=.65)
    ivory = material("Oatmeal cloth", "edded0", cloth=True)
    sole = material("Soft cocoa rubber", "5c4756")
    lock = material("Satin highlights on lilac waves", "805391", .34)
    pigment = lock.node_tree.nodes.new("ShaderNodeVertexColor")
    pigment.layer_name = "Lilac pigments"
    shader = lock.node_tree.nodes.get("Principled BSDF")
    lock.node_tree.links.new(pigment.outputs["Color"], shader.inputs["Base Color"])
    violet = (material("Deep lilac scalp","483050",.48),lock,material("Flyaway lilac","8f6a9e",.43))
    head = make_variant("Peach complexion and facial features",face,skin,gold)
    hands(skin)
    hems = trousers(material("Indigo denim", "456385", cloth=True),
                   material("Faded denim cuff", "557696", cloth=True),
                   material("Deep indigo seam", "344960"),material("Canvas topstitch", "b2956f"))
    groups = {
        "hair":make_variant("Hair | airy lilac waves",hair,violet),
        "seat":make_variant("Hair | fitted to beret",hair,violet,True),
        "hat":make_variant("Cream beret",beret,ivory,material("Toasted wool edging","c9a991",cloth=True),gold),
        "hoodie":make_variant("Mint hoodie",hoodie,material("Sea-glass fleece","719e8d", cloth=True),
            material("Mint rib knit","547f70",cloth=True),material("Mint embroidery","bdd8bb"),ivory,gold),
        "coat":make_variant("Night coat",coat,material("Mulberry twill","4d2947",cloth=True),
            material("Violet collar","673b58",cloth=True),ivory,gold,material("Rose edge","a1748b")),
        "sneakers":make_variant("Low canvas shoes",footwear,"sneakers",ivory,sole,gold,material("Laces","fff0d3")),
        "boots":make_variant("Stardust boots",footwear,"boots",material("Ivory satin leather","e3ccac",.41),
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
    fit_pose()
    select(groups, "hoodie", "hair", "boots")
    if args.blend:
        args.blend.parent.mkdir(parents=True, exist_ok=True)
        for screen in bpy.data.screens:
            for area in screen.areas:
                if area.type == "VIEW_3D":
                    area.spaces.active.region_3d.view_perspective = "CAMERA"
        bpy.ops.wm.save_as_mainfile(filepath=str(args.blend.resolve()))
    variants = {
        "hoodie": ("hoodie","hair","boots"),
        "hoodie-beret": ("hoodie","seat","hat","boots"),
        "coat": ("coat","hair","boots"),
        "coat-beret": ("coat","seat","hat","boots"),
        "sneakers": ("hoodie","hair","sneakers"),
    }
    for name, visible in variants.items():
        select(groups, *visible)
        scene.render.filepath = str((args.output/f"{name}.png").resolve())
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
