"""Build the pose and render the Alchankki wardrobe study with Blender 4.3."""
import argparse
from math import cos, exp, pi, sin, sqrt
from pathlib import Path
import sys

import bpy
from mathutils import Vector
from mathutils.geometry import interpolate_bezier


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
        noise.inputs["Detail"].default_value = 1
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


def rings(name, rows, mat, *, start=0, stop=2*pi, count=40, cap=True, smooth=2):
    """Elliptical cross sections in x/y. Angle zero is the front."""
    closed = stop - start >= 2*pi - 1e-5
    vertices = []
    for x, y, z, width, depth in rows:
        for i in range(count):
            a = start + (stop - start)*i/(count if closed else count-1)
            vertices.append((x + width*sin(a), y - depth*cos(a), z))
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


def tube(name, rows, mat, smooth=2):
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
            vertices.append(center + across*(row[3]*cos(a)) + depth*(row[4]*sin(a)))
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
    scene.cycles.samples = 18 if draft else 108
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
    scene.world = bpy.data.worlds.new("Warm studio")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get("Background").inputs[0].default_value = (.34, .29, .44, 1)
    scene.world.node_tree.nodes.get("Background").inputs[1].default_value = .47
    focus = Vector((0, -.02, 2.97))
    bpy.ops.object.camera_add(location=(6.85, -19, 5.30))
    scene.camera = bpy.context.object
    scene.camera.name = "Shared orthographic outfit camera"
    scene.camera.rotation_euler = (focus - scene.camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera.data.type = "ORTHO"
    scene.camera.data.ortho_scale = 6.37

    for name, where, power, size, color in [
        ("Apricot key", (-3, -6, 8), 590, 5, (1, .84, .73)),
        ("Lavender fill", (4, -4, 4.2), 280, 5, (.82, .86, 1)),
        ("Hair and shoulder rim", (1, 3, 7), 530, 3.1, (.97, .78, 1)),
    ]:
        bpy.ops.object.light_add(type="AREA", location=where)
        obj = bpy.context.object
        obj.name = name
        obj.data.energy, obj.data.size, obj.data.color = power, size, color
        obj.rotation_euler = (Vector((0, 0, 3.7)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    return scene


FACE = [
    (4.67, .038, .045), (4.715, .17, .205), (4.77, .29, .28),
    (4.90, .403, .358), (5.045, .458, .387), (5.19, .462, .382),
    (5.35, .43, .355), (5.49, .343, .299), (5.57, .203, .197), (5.61, .03, .045)
]


def interpolate(rows, z):
    for a, b in zip(rows, rows[1:]):
        if a[0] <= z <= b[0]:
            t = (z-a[0])/(b[0]-a[0])
            return [v+(w-v)*t for v, w in zip(a[1:], b[1:])]
    return (rows[0] if z < rows[0][0] else rows[-1])[1:]


def front(x, z, relief=0):
    w, d = interpolate(FACE, z)
    nose = .064*exp(-((x/.085)**2 + ((z-4.975)/.073)**2))
    return -.039 - d*sqrt(max(.01, 1-(x/w)**2)) - nose - relief


def face(skin, gold):
    head_rows = []
    for i in range(69):
        z = 4.67 + (5.61-4.67)*i/68
        rx, ry = interpolate(FACE, z)
        head_rows.append((0, -.039, z, rx, ry))
    head = rings("Face and jaw", head_rows, skin, count=112, smooth=1)
    for v in head.data.vertices:
        x, y, z = v.co
        if y < -.04:
            v.co.y -= .064*exp(-((x/.085)**2 + ((z-4.975)/.073)**2))
    blush = head.data.color_attributes.new(name="Face tones", type="FLOAT_COLOR", domain="POINT")
    for v, attribute in zip(head.data.vertices, blush.data):
        x, y, z = v.co
        pink = exp(-((abs(x)-.284)/.112)**2 - ((z-4.96)/.066)**2)*.36 if y < -.23 else 0
        attribute.color = (*[a + (b-a)*pink for a, b in zip(linear("edaa8f"), linear("db766e"))], 1)
    face_mat = skin.copy()
    face_mat.name = "Warm complexion with cheek tint"
    nodes = face_mat.node_tree.nodes
    color = nodes.new("ShaderNodeVertexColor")
    color.layer_name = blush.name
    face_mat.node_tree.links.new(color.outputs["Color"], nodes.get("Principled BSDF").inputs["Base Color"])
    head.data.materials[0] = face_mat

    lash = material("Plum lash", "291b36")
    brow = material("Soft violet brow", "615070")
    white = material("Warm eye white", "fff1ec", .34)
    iris_edge = material("Iris edge", "5c284d")
    iris = material("Honey rose iris", "ab5356", .36)
    iris_low = material("Amber iris reflection", "efad72", .42)
    gleam = material("Catchlights", "fff6db", .22)
    lip = material("Rose lip", "bd6d69")
    shadow = material("Mouth crease", "77474d")
    nose_shade = material("Subtle nose shadow", "bd7e75")

    def contour(name, pts, radius, mat, relief, radii=None):
        return strand(name, [(x, front(x, z, relief), z) for x, z in pts], radius, mat, radii=radii)

    def eye_patch(name, polygon, center, mat, relief):
        # A convex patch subdivided toward the centre follows the curved cheek.
        vertices = [(center[0], front(*center, relief), center[1])]
        faces = []
        n = len(polygon)
        for level in range(1, 5):
            f = level / 4
            for px, pz in polygon:
                x, z = center[0]+(px-center[0])*f, center[1]+(pz-center[1])*f
                vertices.append((x, front(x, z, relief), z))
            k = 1 + (level-1)*n
            for j in range(n):
                s = (j+1)%n
                faces.append((0, k+j, k+s) if level==1 else (k+j-n, k+j, k+s, k+s-n))
        return mesh(name, vertices, faces, mat)

    def oval(name, x, z, rx, rz, mat, lift):
        poly = [(x+rx*cos(i*pi/18), z+rz*sin(i*pi/18)) for i in range(36)]
        eye_patch(name, poly, (x, z), mat, lift)

    for side in (-1, 1):
        ear_x = .436*side
        sphere("Ear", (ear_x, -.013, 4.998), (.102, .082, .146), skin)
        sphere("Ear inset", (ear_x+.017*side, -.079, 4.986), (.048, .018, .075), nose_shade)
        sphere("Tiny gold stud", (ear_x+.026*side, -.094, 4.924), (.026, .018, .027), gold)
        a, b = Vector((.065, 5.105, 0)), Vector((.383, 5.126, 0))
        top = interpolate_bezier(a, Vector((.142, 5.221, 0)), Vector((.284, 5.245, 0)), b, 24)
        bottom = interpolate_bezier(b, Vector((.322, 5.021, 0)), Vector((.157, 5.018, 0)), a, 24)
        eye_patch("Almond eye", [(side*p.x,p.y) for p in (*top[:-1],*bottom[:-1])], (.218*side,5.115), white, .018)
        x = .217*side+.004
        oval("Iris rim", x, 5.123, .073, .078, iris_edge, .026)
        oval("Warm iris", x, 5.119, .058, .062, iris, .030)
        oval("Iris lower gradient", x+.009, 5.091, .040, .027, iris_low, .033)
        oval("Pupil", x, 5.128, .027, .047, lash, .035)
        oval("Window reflection", x-.025, 5.151, .022, .022, gleam, .039)
        oval("Reflected fill", x+.026, 5.103, .009, .009, gleam, .037)
        contour("Upper lash", [(side*p.x, p.y) for p in top[::3]], .017, lash, .025,
                [.28, .71, .88, 1, 1, 1.09, 1.15, .70])
        contour("Outer lash tips", [(side*.308,5.174), (side*.375,5.143), (side*.409,5.166)], .018, lash, .019, [.56,1,.02])
        contour("Lower lash", [(side*p.x, p.y) for p in bottom[::4]], .006, brow, .022)
        contour("Soft eyebrow", [(side*.090,5.278), (side*.177,5.309), (side*.265,5.307), (side*.356,5.268)], .022, brow, .015, [.55,1,.72,.07])
    contour("Small nose shadow", [(-.038,4.943), (.001,4.938), (.032,4.948)], .009, nose_shade, .005, [.08, .80, .04])
    contour("Soft lower lip", [(-.100,4.858), (-.028,4.839), (.035,4.841), (.098,4.870)], .020, lip, .012, [.12,.92,.73,.13])
    contour("Quiet smile", [(-.103,4.865), (-.045,4.860), (.030,4.858), (.101,4.878)], .009, shadow, .021, [.15, .6, 1, .1])


def hair(materials, hatted=False):
    deep, violet, lilac, light = materials

    def seat(z):
        return 5.28 + (z-5.28)*.70 if hatted and z>5.28 else z

    # The front part is shorter than the back. Its scalp shell closes the
    # silhouette at the temples and continues behind the sculpted locks.
    vertices = []
    n = 72
    for j in range(26):
        for i in range(n):
            a = i*2*pi/n
            limit = .99 + 1.27*((1-cos(a))/2)**.52 + .065*sin(2*a)
            t = .015 + (limit-.015)*j/25
            vertices.append((.513*sin(t)*sin(a), .008-.447*sin(t)*cos(a), seat(5.15+.535*cos(t))))
    faces = [tuple(reversed(range(n)))]
    for j in range(25):
        for i in range(n):
            k = (i+1) % n
            faces.append(tuple(j*n + p for p in (i,k,k+n,i+n)))
    mesh("Scalp and rear silhouette", vertices, faces, deep, 1)

    for side in (-1, 1):
        for i in range(5):
            x = .39 + i*.051
            z = 5.27-i*.045
            y = .23-i*.087
            rows = [(side*.278, y+.08, seat(z+.25), .069, .056),
                    (side*x, y+.032, seat(z), .138-i*.004, .093),
                    (side*(x-.027+i*.007), y-.023, 4.84, .132-i*.004, .091),
                    (side*(x+.053), y-.020, 4.60-i*.033, .120-i*.007, .080),
                    (side*(x+.005-i*.016), y-.125, 4.43-i*.016, .095-i*.004, .073),
                    (side*(x-.18+i*.014), y-.141, 4.24-i*.024, .083-i*.005, .058),
                    (side*(x-.08+i*.023), y-.198, 4.23-i*.009, .002, .002)]
            tube("Sculpted lilac wave", rows, (deep, violet, lilac, violet, lilac)[i])
            if i > 1:
                strand("Fine line along the wave", [(x,y-d*.91,z) for x,y,z,w,d in rows[1:]],
                       .013, light, radii=[.1,.9,.58,.36,.25,.02])

    bangs = [
        [( .129,-.18,5.627,.083,.058), (-.048,-.30,5.589,.151,.067), (-.224,-.399,5.446,.155,.060), (-.358,-.372,5.285,.113,.057), (-.483,-.272,5.087,.066,.034), (-.488,-.201,4.982,.002,.002)],
        [( .093,-.243,5.590,.064,.062), (-.051,-.372,5.52,.147,.059), (-.181,-.463,5.384,.147,.052), (-.314,-.405,5.264,.101,.052), (-.43,-.327,5.144,.065,.039), (-.442,-.310,4.994,.002,.003)],
        [( .121,-.25,5.548,.061,.050), (.20,-.393,5.491,.112,.062), (.298,-.428,5.368,.128,.053), (.389,-.351,5.267,.094,.048), (.465,-.258,5.122,.061,.040), (.429,-.275,4.951,.002,.002)],
        [( .15,-.16,5.651,.041,.031), (.282,-.261,5.56,.122,.067), (.395,-.317,5.457,.131,.059), (.481,-.282,5.296,.087,.045), (.546,-.164,5.145,.037,.033), (.516,-.222,5.064,.002,.002)],
    ]
    for i, raw in enumerate(bangs):
        # The upper tips slip under the wool band. Keep the free ends and
        # temple volume, but draw the hair toward the scalp just at the band.
        rows = [(x, y + (.145*max(0,min(1,(z-5.25)/.25)) if hatted else 0),
                 seat(z)-(.088 if hatted and j<3 else 0),
                 w*(.62 if hatted and j<3 else 1), d*(.68 if hatted and j<3 else 1))
                for j,(x,y,z,w,d) in enumerate(raw)]
        tube("Side-part fringe", rows, lilac if i in (1, 2) else violet)
        strand("Painted fringe sheen", [(x,y-d*.93,z+.015) for x,y,z,w,d in rows],
               .018, light, radii=[.02,.43,.73,.41,.12,.02])


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
    crown = rings("Sculpted cream beret", rows, cream)
    rim = rings("Wool hatband", [(*row[:3],row[3]+.008,row[4]+.009) for row in rows[:3]], edge, cap=False)
    for obj in (crown, rim):
        for v in obj.data.vertices:
            v.co.z -= v.co.x*.115
    nub = sphere("Beret wool tab", (-.215, .038, 5.843), (.040,.036,.071), edge)
    nub.rotation_euler.y = -.44
    points = [(-.006+.522*sin(t), .038-.438*cos(t), 5.413-.06*sin(t)) for t in [i*2*pi/48 for i in range(49)]]
    strand("Rolled brim piping", points, .015, cream)
    flower("Brass pin", -.299, -.377, 5.519, .070, gold, edge)
    strand("Pin embroidered stem", [(-.30,-.394,5.48),(-.357,-.358,5.456),(-.397,-.313,5.461)], .009, gold)


DENIM = [
    (.58,.10,.153,.141), (.71,.14,.160,.147), (.94,.155,.168,.154),
    (1.20,.12,.175,.156), (1.53,.054,.195,.170), (1.78,.015,.206,.191),
    (2.035,.013,.232,.216), (2.31,.017,.255,.248), (2.55,.033,.282,.257),
    (2.80,.068,.269,.247), (3.02,.082,.252,.224), (3.22,.09,.235,.202),
]


def low_position(side):
    return side*(.40 if side < 0 else .38), -.03 if side < 0 else .17


def trousers(denim, bright, dark, stitches):
    pieces = []
    for side in (-1, 1):
        points = []
        basex, basey = low_position(side)
        for z, cy, rx, ry in DENIM:
            blend = max(0, min(1,(z-.85)/2.15))
            cx = basex*(1-blend)+side*.217*blend
            points.append((cx, cy+basey*(1-blend), z, rx, ry))
        pieces.append(rings("Tapered denim leg", points, denim, count=42))
        for offset, tint, width in [(0,dark,.011),(-.028,stitches,.004)]:
            strand("Outseam", [(cx+(rx-.010)*side, cy+offset, z) for cx,cy,z,rx,ry in points[:-1]], width, tint)
        rings("Folded hem", [(x,y,z+.015+k,rx+.009,ry+.006) for k,(x,y,z,rx,ry) in zip((0,.04),points[:2])], bright, cap=False)
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
    strand("Denim fly topstitch", [(.020,-.163,3.26),(.026,-.180,3.127),
           (.038,-.185,2.993),(.078,-.184,2.907)], .005, stitches)



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
        rows = [(side*.399,.023,4.231,.191,.212),(side*.568,.029,4.139,.218,.201),
                (side*.680,.032,3.918,.175,.168),(side*.76,.013,3.73,.163,.149),
                (side*(x-.18),dy+.023,3.503,.127,.13),(side*(x-.10),dy+.010,dz+.36,.135,.128),
                (side*(x-.053),dy,dz+.20,.117,.112),(side*(x-.035),dy,dz+.141,.103,.104)]
        tube("Separately fitted sleeve", rows,fabric)
        for bend in (5,6):
            bx,by,bz,wr,dr = rows[bend]
            strand("Soft sleeve fold",[(bx-wr*.63,by-dr*.68,bz+.023),
                  (bx-wr*.17,by-dr*.96,bz+.017),(bx+wr*.28,by-dr*.94,bz+.032)],
                   .009,fabric,radii=[.10,1,.05])
        lx,ly,lz,lw,ld = rows[-1]
        tube("Finished wrist cuff", [(lx-side*.021,ly,lz+.080,lw*1.12,ld*1.13),
             (lx-side*.012,ly,lz+.058,lw*1.13,ld*1.14),
             (lx,ly,lz+.012,lw*1.04,ld*1.06),
             (lx+side*.004,ly,lz+.008,lw*.94,ld*.96)],cuff,1)
        if trim:
            strand("Cuff saddle stitching", [(side*(x-.141+i*.020),dy-.091,dz+.227-i*.010) for i in range(7)],.009,trim)
            for i in range(2):
                sphere("Working sleeve button", (side*(x+.011-i*.019),dy-.093,dz+.22+i*.068),(.023,.016,.024),trim)


def hoodie(fabric, rib, seam, lining, gold):
    rings("Mint fleece torso", TORSO, fabric, cap=False)
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
    rings("Cream high-neck underlayer", [(x,y,z,w*.93,d*.95) for x,y,z,w,d in TORSO] +
          [(0,.004,4.445,.177,.161),(0,-.001,4.516,.175,.161)], inner, cap=False)
    rows = [
        (0,.067,2.13,.672,.473),(0,.067,2.158,.674,.477),(0,.069,2.305,.659,.461),
        (0,.062,2.64,.609,.390),(0,.053,3.01,.528,.336),(0,.043,3.39,.464,.301),
        (0,.053,3.65,.439,.283),(0,.051,3.926,.508,.319),(0,.029,4.174,.527,.275),
        (0,.024,4.284,.510,.241),(0,.023,4.356,.417,.219),(0,.014,4.440,.214,.173)
    ]
    obj = rings("Open night coat", rows, fabric, start=.42, stop=2*pi-.42, cap=False)
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
            return y - d*sqrt(max(0, 1-(x/w)**2)) - relief

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
        def shape(rows, label, mat, cap=True):
            return rings(label, [(x,y+offset,z,w,d) for z,y,w,d in rows], mat, cap=cap)
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
        shape([(z-.061,cy-.002,rx+.009,ry+.008),(z-.047,cy,rx+.016,ry+.013),
              (z-.005,cy,rx+.017,ry+.014),(z+.009,cy,rx+.009,ry+.006)],"Open padded shoe collar",trim,cap=False)
        pts = [(x+.207*sin(a),offset-.183-.402*cos(a),.155) for a in [i*2*pi/48 for i in range(49)]]
        strand("Welt stitch",pts,.008,trim)
        if boot:
            # The front tongue, crossed straps and star are in front of the
            # denim. The curved rear wall encloses the leg in the same mesh.
            inset_panel("Pointed leather tongue",[(x-.131,offset-.157,.612),(x-.113,offset-.123,.880),
                        (x,offset-.116,.962),(x+.113,offset-.123,.880),(x+.131,offset-.157,.612)],leather)
            for t in (-1,1):
                strand("Gilded crossed boot strap",[(x-.158,offset-.104,.716-t*.088),
                      (x-.073,offset-.168,.716-t*.038),(x+.081,offset-.163,.716+t*.04),
                      (x+.159,offset-.097,.716+t*.086)],.019,trim)
            points = [(x+(.114 if i%2==0 else .039)*sin(i*pi/4),offset-.192,
                       .728+(.125 if i%2==0 else .043)*cos(i*pi/4)) for i in range(8)]
            inset_panel("Four-point engraved star", points, trim, .015)
            sphere("Enamel on boot star",(x,offset-.214,.728),(.033,.016,.042),lace)
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
    skin = material("Peach skin", "edaa8f", .50)
    skin.node_tree.nodes.get("Principled BSDF").inputs["Subsurface Weight"].default_value = .07
    gold = material("Champagne brass", "bf8849", .30, metal=.58)
    ivory = material("Oatmeal cloth", "edded0", cloth=True)
    sole = material("Soft cocoa rubber", "5c4756")
    violet = tuple(material(name, color, .43) for name,color in [
        ("Mulberry hair shadow","443053"),("Amethyst hair","6b4c83"),
        ("Soft lilac lock","9673ac"),("Lilac strands","b99bca")
    ])
    head = make_variant("Peach complexion and facial features",face,skin,gold)
    hands(skin)
    trousers(material("Indigo denim", "456385", cloth=True),material("Faded denim cuff", "557696", cloth=True),
             material("Deep indigo seam", "344960"),material("Canvas topstitch", "b2956f"))
    groups = {
        "hair":make_variant("Hair | airy lilac waves",hair,violet),
        "seat":make_variant("Hair | fitted to beret",hair,violet,True),
        "hat":make_variant("Cream beret",beret,ivory,material("Toasted wool edging","c9a991",cloth=True),gold),
        "hoodie":make_variant("Mint hoodie",hoodie,material("Sea-glass fleece","83ada0", cloth=True),
            material("Mint rib knit","6c9a8c",cloth=True),material("Mint embroidery","bdd8bb"),ivory,gold),
        "coat":make_variant("Night coat",coat,material("Mulberry twill","543756",cloth=True),
            material("Violet collar","734f6c",cloth=True),ivory,gold,material("Rose edge","a1748b")),
        "sneakers":make_variant("Low canvas shoes",footwear,"sneakers",ivory,sole,gold,material("Laces","fff0d3")),
        "boots":make_variant("Stardust boots",footwear,"boots",material("Ivory satin leather","e3ccac",.41),
            sole,gold,material("Lilac enamel","76538b",.26))
    }
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
