"""Editable cel shading for the Blender wardrobe scene."""
import bpy


def linear(hex_color):
    values = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values]


def tone_curve(tree, signal, stops, label):
    node = tree.nodes.new("ShaderNodeValToRGB")
    node.label = label
    ramp = node.color_ramp
    ramp.interpolation = "LINEAR"
    for element, (position, color) in zip(ramp.elements, (stops[0], stops[-1])):
        element.position, element.color = position, (*color,1)
    for position, color in stops[1:-1]:
        ramp.elements.new(position).color = (*color,1)
    tree.links.new(signal, node.inputs[0])
    return node.outputs["Color"]


def studio_ink_shader():
    tree = bpy.data.node_groups.new("Wardrobe cel shading", "ShaderNodeTree")
    sockets = (
        ("Surface", "OUTPUT", "NodeSocketShader"),
        ("Pigment", "INPUT", "NodeSocketColor"),
        ("Shadows", "INPUT", "NodeSocketFloat"),
        ("Highlights", "INPUT", "NodeSocketFloat"),
        ("Highlight colour", "INPUT", "NodeSocketColor"),
        ("Edge ink", "INPUT", "NodeSocketFloat"),
    )
    for name, side, kind in sockets:
        socket = tree.interface.new_socket(name=name, in_out=side, socket_type=kind)
        if kind == "NodeSocketFloat":
            socket.min_value, socket.max_value = 0, 1
    nodes, links = tree.nodes, tree.links
    panel = nodes.new("NodeGroupInput").outputs
    panel["Pigment"].node.location = (-1065, 115)

    def connect(a, b):
        if isinstance(a,bpy.types.NodeSocket):
            links.new(a,b)
        else:
            b.default_value = a

    def math_node(operation, a, b=0, *, vector=False):
        node = nodes.new("ShaderNodeVectorMath" if vector else "ShaderNodeMath")
        node.operation = operation
        connect(a,node.inputs[0])
        if operation not in ("ABSOLUTE","NORMALIZE"):
            connect(b,node.inputs[1])
        return node.outputs["Value" if operation=="DOT_PRODUCT" or not vector else "Vector"]

    def mix(name, operation, weight, a, b):
        node = nodes.new("ShaderNodeMixRGB")
        node.label, node.blend_type = name, operation
        for socket,value in zip(node.inputs,(weight,a,b)):
            connect(value,socket)
        return node.outputs[0]

    lambert = nodes.new("ShaderNodeBsdfDiffuse")
    lambert.inputs["Color"].default_value = (1,1,1,1)
    light = nodes.new("ShaderNodeShaderToRGB")
    links.new(lambert.outputs[0],light.inputs[0])
    luma = nodes.new("ShaderNodeRGBToBW")
    links.new(light.outputs["Color"],luma.inputs[0])
    shade, mid, lit = (.43,.36,.52), (.75,.68,.81), (1.09,1.045,1.015)
    brightness = tone_curve(tree,luma.outputs[0],[
        (0,shade),(.225,shade),(.267,mid),(.446,mid),(.485,lit),(1,lit)
    ],"Violet shadow · half-tone · warm light")
    paint = mix("Light over pigment","MULTIPLY",panel["Shadows"],panel["Pigment"],brightness)
    lambert.location = (-1065,450)
    light.location = (-850,450)
    luma.location = (-666,450)
    brightness.node.location = (-480,450)
    paint.node.location = (50,450)

    geometry = nodes.new("ShaderNodeNewGeometry").outputs
    normal, eye = geometry["Normal"], geometry["Incoming"]
    def dot(a,b):
        return math_node("DOT_PRODUCT",a,b,vector=True)

    key_and_view = math_node("ADD",eye,(-.48,-.66,.57),vector=True)
    half = math_node("NORMALIZE",key_and_view,vector=True)
    specular = dot(normal,half)
    highlight = tone_curve(tree,specular,[
        (0,(0,0,0)),(.922,(0,0,0)),(.970,(1,1,1)),(1,(1,1,1))
    ],"Narrow paint highlights")
    glare = math_node("MULTIPLY",highlight,panel["Highlights"])
    with_highlight = mix("Coloured highlight","SCREEN",glare,paint,panel["Highlight colour"])
    for socket,location in [
        (normal,(-1065,-185)),(key_and_view,(-862,55)),(half,(-687,55)),
        (specular,(-513,55)),(highlight,(-337,55)),(glare,(-18,55)),
        (with_highlight,(260,450)),
    ]:
        socket.node.location = location

    view_dot = dot(normal,eye)
    glancing = math_node("ABSOLUTE",view_dot)
    ink = tone_curve(tree,glancing,[(0,(1,1,1)),(.10,(1,1,1)),(.26,(0,0,0)),(1,(0,0,0))],
                     "Contour and folds")
    weight = math_node("MULTIPLY",ink,panel["Edge ink"])
    painted = mix("Soft internal ink","MULTIPLY",weight,with_highlight,(.29,.19,.36,1))
    for socket,location in [
        (view_dot,(-861,-300)),(glancing,(-686,-300)),(ink,(-505,-300)),
        (weight,(-191,-300)),(painted,(467,450)),
    ]:
        socket.node.location = location
    emission = nodes.new("ShaderNodeEmission")
    emission.location = (674,450)
    links.new(painted,emission.inputs[0])
    output = nodes.new("NodeGroupOutput")
    output.location = (865,450)
    links.new(emission.outputs[0],output.inputs["Surface"])
    return tree


def style_materials():
    group = studio_ink_shader()
    surfaces = {
        # Amount of banded light, highlight weight, coloured rim strength.
        "face": (.49,.011,.09,"ffd7bc"),
        "skin": (.68,.021,.22,"ffd6bc"),
        "cloth": (.87,.055,.34,"ddd8f1"),
        "hair": (.76,.26,.38,"e8d2ff"),
        "metal": (.87,.80,.30,"ffe5a1"),
        "leather": (.83,.19,.35,"fff4e3"),
        "matte": (.83,.07,.28,"eadcf6"),
    }
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        tree = mat.node_tree
        shader = tree.nodes.get("Principled BSDF")
        if shader is None:
            continue
        kind = mat.get("studio_surface","matte")
        shadow,shine,ink,color = surfaces[kind]
        cel = tree.nodes.new("ShaderNodeGroup")
        cel.node_tree = group
        cel.label = "Cartoon paint and lighting"
        cel.location = (shader.location.x+280,shader.location.y)
        base = shader.inputs["Base Color"]
        cel.inputs["Pigment"].default_value = base.default_value
        if base.is_linked:
            tree.links.new(base.links[0].from_socket,cel.inputs["Pigment"])
        cel.inputs["Shadows"].default_value = shadow
        roughness = shader.inputs["Roughness"].default_value
        cel.inputs["Highlights"].default_value = shine*(1.14-.33*roughness)
        cel.inputs["Highlight colour"].default_value = (*linear(color),1)
        cel.inputs["Edge ink"].default_value = ink
        output = tree.nodes.get("Material Output")
        output.location = (cel.location.x+245,cel.location.y)
        tree.links.new(cel.outputs["Surface"],output.inputs["Surface"])
        tree.nodes.remove(shader)


def add_outline(scene, draft):
    scene.use_nodes = True
    tree = scene.node_tree
    tree.nodes.clear()
    render = tree.nodes.new("CompositorNodeRLayers")
    expanded = tree.nodes.new("CompositorNodeDilateErode")
    expanded.mode = "DISTANCE"
    expanded.distance = 1 if draft else 2
    tree.links.new(render.outputs["Alpha"],expanded.inputs[0])
    stroke = tree.nodes.new("CompositorNodeSetAlpha")
    stroke.mode = "REPLACE_ALPHA"
    stroke.inputs["Image"].default_value = (*linear("473347"),1)
    tree.links.new(expanded.outputs[0],stroke.inputs["Alpha"])
    layer = tree.nodes.new("CompositorNodeAlphaOver")
    layer.inputs[0].default_value = 1
    tree.links.new(stroke.outputs[0],layer.inputs[1])
    tree.links.new(render.outputs["Image"],layer.inputs[2])
    output = tree.nodes.new("CompositorNodeComposite")
    tree.links.new(layer.outputs[0],output.inputs[0])
    for node,location in [(render,(-620,160)),(expanded,(-418,-15)),(stroke,(-207,-15)),
                          (layer,(35,160)),(output,(247,160))]:
        node.location = location
