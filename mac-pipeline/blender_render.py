"""Renders the furry mammoth frame by frame (transparent background + a shadow-catcher table) from a scene.json.

Run inside Blender:   blender -b -P blender_render.py -- scene.json out_dir [--frames a:b] [--quality draft|standard|high]
or with the `bpy` Python module:   python blender_render.py scene.json out_dir ...
"""
import json
import math
import os
import random
import sys

import bpy
import bmesh
from mathutils import Vector

QUALITY = {   # samples, hair children per strand
    'draft': dict(samples=12, children=4, hair_scale=0.5),
    'standard': dict(samples=32, children=8, hair_scale=1.0),
    'high': dict(samples=96, children=12, hair_scale=1.6),
}


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    opts = {'frames': None, 'quality': 'standard', 'device': 'auto'}
    pos = []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == '--frames':
            opts['frames'] = argv[i + 1]; i += 2
        elif a == '--quality':
            opts['quality'] = argv[i + 1]; i += 2
        elif a == '--device':
            opts['device'] = argv[i + 1]; i += 2
        else:
            pos.append(a); i += 1
    return pos, opts


# ---------------------------------------------------------------- helpers
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    return sc


def mat_principled(name, color, rough=0.6, spec=0.3, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    for k in ('Specular IOR Level', 'Specular'):
        if k in bsdf.inputs:
            bsdf.inputs[k].default_value = spec
            break
    if coat:
        for k in ('Coat Weight', 'Clearcoat'):
            if k in bsdf.inputs:
                bsdf.inputs[k].default_value = coat
                break
    return m


def mat_hair(name, color, rough=0.4):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    hair = nt.nodes.new('ShaderNodeBsdfHairPrincipled')
    hair.parametrization = 'COLOR'
    hair.inputs['Color'].default_value = (*color, 1)
    hair.inputs['Roughness'].default_value = rough
    if 'Radial Roughness' in hair.inputs:
        hair.inputs['Radial Roughness'].default_value = 0.5
    if 'Coat' in hair.inputs:
        hair.inputs['Coat'].default_value = 0.15
    # slight per-strand colour variation so the fur isn't flat
    rnd = nt.nodes.new('ShaderNodeHairInfo')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*[c * 0.55 for c in color], 1)
    ramp.color_ramp.elements[1].color = (*[min(1.0, c * 1.25) for c in color], 1)
    nt.links.new(rnd.outputs['Random'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], hair.inputs['Color'])
    nt.links.new(hair.outputs['BSDF'], out.inputs['Surface'])
    return m


def sphere_obj(name, loc, scale, mat, segs=32, rings=16):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    ob.scale = scale
    ob.data.materials.append(mat)
    bpy.context.collection.objects.link(ob)
    return ob


def chain_obj(name, points, radii, mat, segs=14):
    """A tube made from overlapping spheres along `points` (used for the trunk and the tusks)."""
    bm = bmesh.new()
    for p, r in zip(points, radii):
        bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=segs // 2, radius=r, matrix=__import__('mathutils').Matrix.Translation(p))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(mat)
    bpy.context.collection.objects.link(ob)
    return ob


def add_fur(ob, hair_mat, count, length, q, thickness=0.0007, seed=1):
    ob.data.materials.append(hair_mat)
    mod = ob.modifiers.new('Fur', 'PARTICLE_SYSTEM')
    ps = mod.particle_system
    st = ps.settings
    st.type = 'HAIR'
    st.count = max(50, int(count * q['hair_scale']))
    st.hair_length = length
    st.use_advanced_hair = True
    st.child_type = 'INTERPOLATED'
    for attr, val in (('child_nbr', 2), ('rendered_child_count', q['children']), ('child_length', 0.9), ('child_length_threshold', 0.3),
                      ('clump_factor', 0.35), ('clump_shape', 0.2), ('roughness_1', 0.08), ('roughness_1_size', 1.0),
                      ('roughness_2', 0.04), ('roughness_endpoint', 0.12), ('child_radius', 0.25), ('child_roundness', 0.5),
                      ('hair_step', 3), ('display_step', 2), ('render_step', 3), ('use_hair_bspline', True), ('seed', seed)):
        if hasattr(st, attr):
            try:
                setattr(st, attr, val)
            except Exception:
                pass
    for attr in ('root_radius', 'tip_radius'):
        pass
    try:
        st.material_slot = hair_mat.name
    except Exception:
        st.material = len(ob.data.materials)
    # thin strands: Cycles hair width = particle_size * radius
    st.particle_size = thickness
    if hasattr(st, 'root_radius'):
        st.root_radius = 1.0
        st.tip_radius = 0.25
    return ob


def make_mammoth(q):
    skin = mat_principled('Skin', (0.20, 0.12, 0.08), 0.8)
    ivory = mat_principled('Ivory', (0.93, 0.88, 0.74), 0.35, 0.5, 0.3)
    eye = mat_principled('Eye', (0.01, 0.01, 0.012), 0.12, 0.8, 1.0)
    fur_a = mat_hair('FurBody', (0.30, 0.17, 0.09))
    fur_b = mat_hair('FurDark', (0.20, 0.11, 0.065))
    heart_m = bpy.data.materials.new('Heart')
    heart_m.use_nodes = True
    hb = heart_m.node_tree.nodes['Principled BSDF']
    hb.inputs['Base Color'].default_value = (1, 0.3, 0.5, 1)
    for k in ('Emission Color', 'Emission'):
        if k in hb.inputs:
            hb.inputs[k].default_value = (1, 0.25, 0.45, 1)
            break
    if 'Emission Strength' in hb.inputs:
        hb.inputs['Emission Strength'].default_value = 2.0

    root = bpy.data.objects.new('MammothRoot', None)
    bpy.context.collection.objects.link(root)
    body = bpy.data.objects.new('BodyPivot', None)      # hop / squash / lean
    body.parent = root
    bpy.context.collection.objects.link(body)

    parts = {}

    def put(ob, parent=body):
        ob.parent = parent
        return ob

    torso = put(sphere_obj('Torso', (0, 0, 0.105), (0.078, 0.10, 0.072), skin, 40, 20))
    add_fur(torso, fur_a, 1800, 0.026, q, seed=1)
    hump = put(sphere_obj('Hump', (0, 0.025, 0.165), (0.058, 0.055, 0.045), skin))
    add_fur(hump, fur_b, 500, 0.03, q, seed=2)
    # skirt of long fur under the belly
    skirt = put(sphere_obj('Skirt', (0, 0, 0.065), (0.082, 0.105, 0.04), skin))
    add_fur(skirt, fur_b, 900, 0.04, q, seed=3)

    head_pivot = bpy.data.objects.new('HeadPivot', None)
    head_pivot.parent = body
    head_pivot.location = (0, 0.085, 0.135)
    bpy.context.collection.objects.link(head_pivot)
    head = put(sphere_obj('Head', (0, 0.03, 0.005), (0.052, 0.055, 0.058), skin), head_pivot)
    add_fur(head, fur_a, 700, 0.022, q, seed=4)
    crown = put(sphere_obj('Crown', (0, 0.0, 0.045), (0.04, 0.05, 0.03), skin), head_pivot)
    add_fur(crown, fur_b, 350, 0.035, q, seed=5)
    for sx in (-1, 1):
        ear = put(sphere_obj('Ear%d' % sx, (sx * 0.056, 0.012, 0.012), (0.011, 0.034, 0.042), skin, 20, 12), head_pivot)
        add_fur(ear, fur_b, 160, 0.012, q, seed=6)
        eye_o = put(sphere_obj('Eye%d' % sx, (sx * 0.026, 0.078, 0.022), (0.0085, 0.0085, 0.0085), eye, 20, 12), head_pivot)
        parts['eye%d' % sx] = eye_o
    # trunk
    n = 11
    tp = [(0, 0.075 + 0.012 * i * 0.2, 0.0 - 0.012 * i - 0.006 * i * i * 0.12) for i in range(n)]
    tr = [0.024 * (1 - i / (n * 1.25)) + 0.006 for i in range(n)]
    trunk = put(chain_obj('Trunk', tp, tr, skin), head_pivot)
    add_fur(trunk, fur_a, 260, 0.012, q, seed=7)
    for sx in (-1, 1):
        pts = [(sx * (0.03 + 0.016 * math.sin(i / 8 * 2.1)), 0.07 + 0.012 * i, -0.02 - 0.004 * i + 0.011 * math.sin(i / 8 * math.pi) ** 2 * 1.5) for i in range(9)]
        rad = [0.0085 * (1 - i / 11) for i in range(9)]
        put(chain_obj('Tusk%d' % sx, pts, rad, ivory, 12), head_pivot)

    legs = []
    for ix, sx in enumerate((-1, 1)):
        for iy, ly in enumerate((-0.058, 0.055)):
            pivot = bpy.data.objects.new('LegPivot%d%d' % (ix, iy), None)
            pivot.parent = body
            pivot.location = (sx * 0.048, ly, 0.075)
            bpy.context.collection.objects.link(pivot)
            leg = put(sphere_obj('Leg%d%d' % (ix, iy), (0, 0, -0.04), (0.024, 0.026, 0.045), skin, 20, 12), pivot)
            add_fur(leg, fur_b, 220, 0.022, q, seed=10 + ix * 2 + iy)
            legs.append((pivot, 1 if (ix + iy) % 2 == 0 else -1))
    tail = put(sphere_obj('Tail', (0, -0.1, 0.11), (0.011, 0.014, 0.03), skin, 16, 10))
    add_fur(tail, fur_b, 80, 0.025, q, seed=20)

    # heart pool
    hearts = []
    for i in range(16):
        h = sphere_obj('Heart%d' % i, (0, 0, -5), (0.008, 0.008, 0.008), heart_m, 12, 8)
        h.hide_render = True
        hearts.append(h)
    return dict(root=root, body=body, head=head_pivot, legs=legs, eyes=[parts['eye-1'], parts['eye1']], hearts=hearts)


def build_scene(spec, q, device):
    sc = reset_scene()
    W, H = spec['width'], spec['height']
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.engine = 'CYCLES'
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    cy = sc.cycles
    cy.samples = q['samples']
    cy.use_denoising = True
    cy.use_adaptive_sampling = True
    cy.max_bounces = 4
    cy.diffuse_bounces = 2
    cy.glossy_bounces = 2
    cy.transmission_bounces = 2
    cy.transparent_max_bounces = 4
    try:
        cy.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    # GPU (Metal on Apple Silicon) when available
    cy.device = 'CPU'
    if device != 'cpu':
        try:
            prefs = bpy.context.preferences.addons['cycles'].preferences
            for t in ('METAL', 'CUDA', 'OPTIX', 'HIP'):
                try:
                    prefs.compute_device_type = t
                    prefs.get_devices()
                    gpus = [d for d in prefs.devices if d.type == t]
                    if gpus:
                        for d in prefs.devices:
                            d.use = d.type == t or d.type == 'CPU'
                        cy.device = 'GPU'
                        break
                except Exception:
                    continue
        except Exception:
            pass

    cam = spec['cam']
    cdata = bpy.data.cameras.new('Cam')
    cdata.sensor_fit = 'AUTO'
    cdata.angle = math.radians(cam['fov'])
    cobj = bpy.data.objects.new('Cam', cdata)
    bpy.context.collection.objects.link(cobj)
    cobj.location = Vector(cam['pos'])
    direction = Vector(cam['target']) - cobj.location
    cobj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cobj

    # table = shadow catcher
    bpy.ops.mesh.primitive_plane_add(size=6)
    plane = bpy.context.active_object
    plane.name = 'Table'
    plane.is_shadow_catcher = True

    # lighting from the footage
    L = spec['light']
    world = bpy.data.worlds.new('World')
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (*L['ambient'], 1)
    bg.inputs['Strength'].default_value = L['ambient_strength']
    sc.world = world
    sun = bpy.data.lights.new('Sun', 'AREA')
    sun.shape = 'DISK'
    sun.size = 0.5
    sun.energy = L['key_energy']
    sun.color = tuple(L['key_color'])
    sobj = bpy.data.objects.new('Key', sun)
    sobj.location = Vector(L['key_pos'])
    sobj.rotation_euler = (Vector((0, 0, 0.05)) - sobj.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.collection.objects.link(sobj)

    m = make_mammoth(q)
    return sc, m


def apply_pose(m, p):
    m['root'].location = (p['x'], p['y'], 0)
    m['root'].rotation_euler = (0, 0, p['yaw'])
    b = m['body']
    b.location = (0, 0, p['hop'])
    b.scale = (p['sx'], p['sz'], p['sy'])
    b.rotation_euler = (p['pitch'], p['roll'], p['spin'])
    m['head'].rotation_euler = (-p['nod'] * 0.5, 0, p['turn'])
    for pivot, sign in m['legs']:
        pivot.rotation_euler = (sign * p['walk'] * 0.55, 0, 0)
    for e in m['eyes']:
        e.scale.z = 0.0085 * p['squint']
    hs = p['hearts']
    for i, h in enumerate(m['hearts']):
        if i < len(hs):
            hx, hy, hz, hscale = hs[i]
            h.hide_render = False
            h.location = (hx, hy, hz)
            h.scale = (0.008 * hscale,) * 3
        else:
            h.hide_render = True


def main():
    pos, opts = parse_args()
    spec_path, out_dir = pos[0], pos[1]
    spec = json.load(open(spec_path))
    q = QUALITY[opts['quality']]
    os.makedirs(out_dir, exist_ok=True)
    sc, m = build_scene(spec, q, opts['device'])
    frames = spec['frames']
    a, b = 0, len(frames)
    if opts['frames']:
        a, b = [int(x) for x in opts['frames'].split(':')]
        b = min(b, len(frames))
    print('Rendering frames %d-%d of %d  (%s, %d samples, device %s)' % (a, b - 1, len(frames), opts['quality'], q['samples'], sc.cycles.device), flush=True)
    for i in range(a, b):
        path = os.path.join(out_dir, 'm_%05d.png' % i)
        if os.path.exists(path):
            continue
        apply_pose(m, frames[i])
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print('frame %d/%d' % (i + 1, len(frames)), flush=True)


if __name__ == '__main__':
    main()
