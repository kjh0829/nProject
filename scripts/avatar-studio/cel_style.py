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


def shader_group(name, sockets):
    tree = bpy.data.node_groups.new(name, "ShaderNodeTree")
    for name, side, kind in sockets:
        socket = tree.interface.new_socket(name=name, in_out=side, socket_type=kind)
        if kind == "NodeSocketFloat":
            socket.min_value, socket.max_value = 0, 1
    return tree


def set_socket(tree, value, socket):
    if isinstance(value,bpy.types.NodeSocket):
        tree.links.new(value,socket)
    else:
        socket.default_value = value


def blend_colour(tree, label, operation, weight, base, layer):
    node = tree.nodes.new("ShaderNodeMixRGB")
    node.label, node.blend_type = label, operation
    for value,slot in zip((weight,base,layer),node.inputs):
        set_socket(tree,value,slot)
    return node.outputs[0]


def studio_ink_shader():
    tree = shader_group("Wardrobe cel shading", (
        ("Surface", "OUTPUT", "NodeSocketShader"),
        ("Pigment", "INPUT", "NodeSocketColor"),
        ("Shadows", "INPUT", "NodeSocketFloat"),
        ("Soft shadows", "INPUT", "NodeSocketFloat"),
        ("Highlights", "INPUT", "NodeSocketFloat"),
        ("Highlight colour", "INPUT", "NodeSocketColor"),
        ("Edge ink", "INPUT", "NodeSocketFloat"),
    ))
    nodes, links = tree.nodes, tree.links
    panel = nodes.new("NodeGroupInput").outputs
    panel["Pigment"].node.location = (-1065, 115)

    def math_node(operation, a, b=0, *, vector=False):
        node = nodes.new("ShaderNodeVectorMath" if vector else "ShaderNodeMath")
        node.operation = operation
        set_socket(tree,a,node.inputs[0])
        if operation not in ("ABSOLUTE","NORMALIZE"):
            set_socket(tree,b,node.inputs[1])
        return node.outputs["Value" if operation=="DOT_PRODUCT" or not vector else "Vector"]

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
    smooth_light = tone_curve(tree,luma.outputs[0],[
        (0,(.60,.50,.63)),(.67,(1.04,1.01,1.0)),(1,(1.08,1.045,1.02))
    ],"Soft light for painted skin")
    shade_filter = blend_colour(tree,"Blend the shadow edge","MIX",panel["Soft shadows"],brightness,smooth_light)
    paint = blend_colour(tree,"Light over pigment","MULTIPLY",panel["Shadows"],panel["Pigment"],shade_filter)
    lambert.location = (-1065,450)
    light.location = (-850,450)
    luma.location = (-666,450)
    brightness.node.location = (-480,665)
    smooth_light.node.location = (-480,410)
    shade_filter.node.location = (-125,540)
    paint.node.location = (70,540)

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
    with_highlight = blend_colour(tree,"Coloured highlight","SCREEN",glare,paint,panel["Highlight colour"])
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
    painted = blend_colour(tree,"Soft internal ink","MULTIPLY",weight,with_highlight,(.29,.19,.36,1))
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


def hair_cel_light():
    tree = shader_group("Hair 01 · Cel light", (
        ("Paint", "OUTPUT", "NodeSocketColor"),
        ("Light", "OUTPUT", "NodeSocketFloat"),
        ("Pigment", "INPUT", "NodeSocketColor"),
    ))
    nodes,links = tree.nodes,tree.links
    settings = nodes.new("NodeGroupInput")
    light = nodes.new("ShaderNodeBsdfDiffuse")
    light.inputs["Color"].default_value = (1,1,1,1)
    rgb = nodes.new("ShaderNodeShaderToRGB")
    luma = nodes.new("ShaderNodeRGBToBW")
    links.new(light.outputs[0],rgb.inputs[0])
    links.new(rgb.outputs[0],luma.inputs[0])
    shadow, half, lit = (.48,.38,.52), (.76,.65,.79), (1.045,.955,.99)
    tone = tone_curve(tree,luma.outputs[0],[
        (0,shadow),(.226,shadow),(.278,half),(.464,half),(.525,lit),(1,lit)
    ],"Plum shadow · muted lilac middle · soft light")
    paint = blend_colour(tree,"Cel values on the pigment","MULTIPLY",1,settings.outputs["Pigment"],tone)
    output = nodes.new("NodeGroupOutput")
    links.new(paint,output.inputs["Paint"])
    links.new(luma.outputs[0],output.inputs["Light"])
    for node,position in [(settings,(-670,275)),(light,(-670,40)),(rgb,(-460,40)),
                          (luma,(-278,40)),(tone.node,(-100,40)),(paint.node,(225,270)),(output,(447,270))]:
        node.location = position
    return tree


def hair_overlap_shade():
    tree = shader_group("Hair 02 · Roots and folds", (
        ("Paint", "OUTPUT", "NodeSocketColor"),
        ("Paint", "INPUT", "NodeSocketColor"),
        ("Occlusion mask", "INPUT", "NodeSocketFloat"),
    ))
    settings = tree.nodes.new("NodeGroupInput")
    shade = blend_colour(tree,"Violet between the locks","MULTIPLY",settings.outputs["Occlusion mask"],
                         settings.outputs["Paint"],(.41,.25,.54,1))
    output = tree.nodes.new("NodeGroupOutput")
    settings.location, shade.node.location, output.location = (-260,40), (0,40), (240,40)
    tree.links.new(shade,output.inputs[0])
    return tree


def hair_brush_light():
    tree = shader_group("Hair 03 · Brush bands and fibers", (
        ("Paint", "OUTPUT", "NodeSocketColor"),
        ("Paint", "INPUT", "NodeSocketColor"),
        ("Light", "INPUT", "NodeSocketFloat"),
        ("Band mask", "INPUT", "NodeSocketFloat"),
        ("Fiber mask", "INPUT", "NodeSocketFloat"),
    ))
    nodes,links = tree.nodes,tree.links
    settings = nodes.new("NodeGroupInput")
    settings.location = (-920,340)
    uv = nodes.new("ShaderNodeUVMap")
    uv.uv_map = "Hair stroke UV"
    uv.location = (-920,-60)
    stretch = nodes.new("ShaderNodeVectorMath")
    stretch.operation = "MULTIPLY"
    stretch.inputs[1].default_value = (77,4.0,1)
    stretch.location = (-710,-60)
    links.new(uv.outputs["UV"],stretch.inputs[0])
    grain = nodes.new("ShaderNodeTexNoise")
    grain.inputs["Scale"].default_value = 1
    grain.inputs["Detail"].default_value = 1.7
    grain.location = (-500,-60)
    links.new(stretch.outputs["Vector"],grain.inputs["Vector"])
    fibers = tone_curve(tree,grain.outputs["Fac"],[
        (0,(0,0,0)),(.49,(.02,.02,.02)),(.59,(.60,.60,.60)),(.68,(1,1,1)),(1,(1,1,1))
    ],"Threads running with each lock")
    fibers.node.location = (-280,-60)
    lit = tone_curve(tree,settings.outputs["Light"],[
        (0,(.18,.18,.18)),(.26,(.29,.29,.29)),(.64,(1,1,1)),(1,(1,1,1))
    ],"Reflections fade in shadow")
    lit.node.location = (-720,340)

    geometry = nodes.new("ShaderNodeNewGeometry")
    geometry.location = (-920,-460)
    aim = nodes.new("ShaderNodeVectorMath")
    aim.operation = "DOT_PRODUCT"
    aim.label = "Direction of the drawing key"
    aim.location = (-710,-460)
    aim.inputs[1].default_value = (-.58,-.61,.54)
    links.new(geometry.outputs["Normal"],aim.inputs[0])
    toward_key = tone_curve(tree,aim.outputs["Value"],[
        (0,(.10,.10,.10)),(.39,(.24,.24,.24)),(.77,(1,1,1)),(1,(1,1,1))
    ],"Reflection on the side facing the key")
    toward_key.node.location = (-500,-460)

    def multiplier(label, a, b, position):
        node = nodes.new("ShaderNodeMath")
        node.label, node.operation, node.location = label, "MULTIPLY", position
        set_socket(tree,a,node.inputs[0])
        set_socket(tree,b,node.inputs[1])
        return node.outputs[0]

    light = multiplier("Light on this face of the lock",lit,toward_key,(-215,80))
    band = multiplier("Curved reflection",light,settings.outputs["Band mask"],(0,380))
    fiber_mask = multiplier("Discontinuous fibers",fibers,settings.outputs["Fiber mask"],(0,-90))
    grain_weight = multiplier("Fine light facing the key",light,fiber_mask,(220,-90))
    base = blend_colour(tree,"Lilac reflection bands","SCREEN",band,settings.outputs["Paint"],
                        (*linear("e2c2de"),1))
    base.node.location = (226,380)
    final = blend_colour(tree,"Pale loose brush strokes","SCREEN",grain_weight,base,
                         (*linear("fbe0f0"),1))
    final.node.location = (452,380)
    output = nodes.new("NodeGroupOutput")
    output.location = (676,380)
    links.new(final,output.inputs[0])
    return tree


def layered_hair_shader():
    tree = shader_group("Wardrobe layered hair", (
        ("Surface", "OUTPUT", "NodeSocketShader"),
        ("Pigment", "INPUT", "NodeSocketColor"),
        ("Masks", "INPUT", "NodeSocketColor"),
    ))
    nodes,links = tree.nodes,tree.links
    input_node = nodes.new("NodeGroupInput")
    input_node.location = (-760,120)
    channels = nodes.new("ShaderNodeSeparateColor")
    channels.label = "Occlusion · brush band · fibers"
    channels.location = (-540,-110)
    links.new(input_node.outputs["Masks"],channels.inputs["Color"])

    stages = []
    for build,position in ((hair_cel_light,(-540,155)), (hair_overlap_shade,(-295,155)),
                           (hair_brush_light,(-50,155))):
        node = nodes.new("ShaderNodeGroup")
        node.node_tree, node.location = build(), position
        node.width = 198
        stages.append(node)
    light, shade, brushes = stages
    links.new(input_node.outputs["Pigment"],light.inputs["Pigment"])
    links.new(light.outputs["Paint"],shade.inputs["Paint"])
    links.new(channels.outputs["Red"],shade.inputs["Occlusion mask"])
    links.new(shade.outputs["Paint"],brushes.inputs["Paint"])
    links.new(light.outputs["Light"],brushes.inputs["Light"])
    links.new(channels.outputs["Green"],brushes.inputs["Band mask"])
    links.new(channels.outputs["Blue"],brushes.inputs["Fiber mask"])
    emission = nodes.new("ShaderNodeEmission")
    emission.location = (220,155)
    links.new(brushes.outputs["Paint"],emission.inputs["Color"])
    output = nodes.new("NodeGroupOutput")
    output.location = (430,155)
    links.new(emission.outputs[0],output.inputs["Surface"])
    return tree


HAIR_MATTE = "Hair coverage"


def style_materials():
    hair_matte = bpy.context.view_layer.aovs.add()
    hair_matte.name, hair_matte.type = HAIR_MATTE, "VALUE"
    group = studio_ink_shader()
    hair_group = layered_hair_shader()
    surfaces = {
        # Shadow amount, softness, physical sheen, coloured rim strength.
        "face": (.30,.91,.008,.06,"ffd7bc"),
        "skin": (.68,0,.021,.22,"ffd6bc"),
        "neck": (.61,.52,.017,.17,"ffd6bc"),
        "cloth": (.87,0,.055,.34,"ddd8f1"),
        "tailored cloth": (.92,.59,.075,.26,"f0dde6"),
        "hair": (.65,.23,.026,.23,"e8d2ff"),
        "metal": (.87,0,.80,.30,"ffe5a1"),
        "leather": (.83,0,.19,.35,"fff4e3"),
        "matte": (.83,0,.07,.28,"eadcf6"),
    }
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        tree = mat.node_tree
        shader = tree.nodes.get("Principled BSDF")
        if shader is None:
            continue
        kind = mat.get("studio_surface","matte")
        if kind == "hair":
            matte = tree.nodes.new("ShaderNodeOutputAOV")
            matte.aov_name = HAIR_MATTE
            matte.inputs["Value"].default_value = 1
            matte.location = (0,-490)
        shadow,soft,shine,ink,color = surfaces[kind]
        cel = tree.nodes.new("ShaderNodeGroup")
        layered_hair = kind == "hair" and mat.get("painted_hair_masks",False)
        cel.node_tree = hair_group if layered_hair else group
        cel.label = "Layered hair paint" if layered_hair else "Cartoon paint and lighting"
        cel.location = (shader.location.x+280,shader.location.y)
        base = shader.inputs["Base Color"]
        cel.inputs["Pigment"].default_value = base.default_value
        if base.is_linked:
            tree.links.new(base.links[0].from_socket,cel.inputs["Pigment"])
        if layered_hair:
            masks = tree.nodes.new("ShaderNodeVertexColor")
            masks.layer_name = "Hair paint masks"
            masks.location = (shader.location.x,shader.location.y-235)
            tree.links.new(masks.outputs["Color"],cel.inputs["Masks"])
        else:
            cel.inputs["Shadows"].default_value = shadow
            cel.inputs["Soft shadows"].default_value = soft
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
    def matte_math(operation, a, b, x, y):
        node = tree.nodes.new("CompositorNodeMath")
        node.operation, node.location = operation, (x,y)
        set_socket(tree,a,node.inputs[0])
        set_socket(tree,b,node.inputs[1])
        return node.outputs[0]

    def expand(matte, pixels, x, y):
        node = tree.nodes.new("CompositorNodeDilateErode")
        node.mode, node.distance, node.location = "DISTANCE", pixels, (x,y)
        tree.links.new(matte,node.inputs[0])
        return node.outputs[0]

    # A two-pixel contour closes the spaces between fine flyaways. Give
    # the visible hair its own softer ink while keeping the garment contour.
    hair = render.outputs[HAIR_MATTE]
    solid = matte_math("SUBTRACT",render.outputs["Alpha"],hair,-640,-60)
    body_ink = expand(solid,1 if draft else 2,-420,-60)
    hair_ink = expand(hair,1,-640,-230)
    soft_ink = matte_math("MULTIPLY",hair_ink,.60,-420,-230)
    outline = matte_math("MAXIMUM",body_ink,soft_ink,-220,-50)
    stroke = tree.nodes.new("CompositorNodeSetAlpha")
    stroke.mode = "REPLACE_ALPHA"
    stroke.inputs["Image"].default_value = (*linear("473347"),1)
    tree.links.new(outline,stroke.inputs["Alpha"])
    layer = tree.nodes.new("CompositorNodeAlphaOver")
    layer.inputs[0].default_value = 1
    tree.links.new(stroke.outputs[0],layer.inputs[1])
    tree.links.new(render.outputs["Image"],layer.inputs[2])
    output = tree.nodes.new("CompositorNodeComposite")
    tree.links.new(layer.outputs[0],output.inputs[0])
    for node,location in [(render,(-880,160)),(stroke,(0,-20)),
                          (layer,(220,160)),(output,(448,160))]:
        node.location = location
