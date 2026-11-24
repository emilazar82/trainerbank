import bpy, bmesh, math, sys

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.fps = 30

# ---------- armature ----------
arm_d = bpy.data.armatures.new('Rig'); arm = bpy.data.objects.new('Rig', arm_d)
scn.collection.objects.link(arm); bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
E = arm_d.edit_bones
def bone(n, h, t, par=None, deform=True):
    b = E.new(n); b.head = h; b.tail = t; b.roll = 0
    if par: b.parent = E[par]; b.use_connect = False
    b.use_deform = deform; return b
bone('root', (0, 0, 0), (0, 0, 0.2), deform=False)
bone('hips', (0, 0, 0.96), (0, 0, 1.10), 'root')
bone('spine', (0, 0, 1.10), (0, 0, 1.30), 'hips')
bone('chest', (0, 0, 1.30), (0, 0, 1.50), 'spine')
bone('head', (0, 0, 1.52), (0, 0, 1.80), 'chest')
for s, x in (('L', 1), ('R', -1)):
    bone('thigh.' + s, (0.10 * x, 0, 0.94), (0.10 * x, 0, 0.52), 'hips')
    bone('shin.' + s, (0.10 * x, 0, 0.52), (0.10 * x, 0, 0.09), 'thigh.' + s)
    bone('foot.' + s, (0.10 * x, 0, 0.09), (0.10 * x, -0.16, 0.03), 'shin.' + s)
    bone('uarm.' + s, (0.23 * x, 0, 1.45), (0.25 * x, 0, 1.17), 'chest')
    bone('farm.' + s, (0.25 * x, 0, 1.17), (0.26 * x, 0, 0.92), 'uarm.' + s)
bpy.ops.object.mode_set(mode='OBJECT')

MATS = ['shirt', 'shorts', 'socks', 'skin', 'hair', 'boot', 'trim', 'glove', 'face', 'pole', 'flag', 'leg', 'arm', 'lip', 'facepl']
COL = {'shirt': (1, .85, .3, 1), 'shorts': (.07, .2, .43, 1), 'socks': (1, .85, .3, 1), 'skin': (.93, .74, .58, 1), 'hair': (.23, .16, .1, 1),
       'boot': (.06, .06, .07, 1), 'trim': (.07, .2, .43, 1), 'glove': (.93, .74, .58, 1), 'face': (.12, .08, .06, 1), 'pole': (.2, .2, .2, 1), 'flag': (1, .5, .05, 1), 'leg': (.93, .74, .58, 1), 'arm': (.93, .74, .58, 1), 'lip': (.75, .5, .42, 1), 'facepl': (1, 1, 1, 1)}
MAT = {}
for m in MATS:
    mt = bpy.data.materials.new(m); mt.diffuse_color = COL[m]; mt.use_nodes = True
    bs = mt.node_tree.nodes['Principled BSDF']; bs.inputs['Base Color'].default_value = COL[m]; bs.inputs['Roughness'].default_value = 1.0
    MAT[m] = mt

class B:
    def __init__(s, name):
        s.name = name; s.bm = bmesh.new(); s.uv = s.bm.loops.layers.uv.new('UVMap'); s.groups = []; s.n = 0; s.mats = []
    def part(s, vf, mat, grp, cyl=None, nocap=False):
        vs, fs = vf
        if nocap: fs = fs[2:]
        if mat not in s.mats: s.mats.append(mat)
        bv = [s.bm.verts.new(v) for v in vs]
        for f in fs:
            try: face = s.bm.faces.new([bv[i] for i in f])
            except ValueError: continue
            face.material_index = s.mats.index(mat)
            if cyl and cyl[0] == 'P':
                _, x0, x1, z0, z1 = cyl
                for lp in face.loops:
                    co = lp.vert.co; lp[s.uv].uv = ((co.x - x0) / (x1 - x0), (co.z - z0) / (z1 - z0))
            elif cyl:
                cx, cy, z0, z1, u0, u1 = cyl
                cen = sum((bv[i].co for i in f), bv[f[0]].co * 0) / len(f)
                uc = math.atan2(cen.y - cy, cen.x - cx) / (2 * math.pi) + 0.5
                for lp in face.loops:
                    co = lp.vert.co; u = math.atan2(co.y - cy, co.x - cx) / (2 * math.pi) + 0.5
                    if u - uc > 0.5: u -= 1
                    if uc - u > 0.5: u += 1
                    lp[s.uv].uv = (u0 + (u1 - u0) * u, (co.z - z0) / (z1 - z0))
            else:
                for lp in face.loops: lp[s.uv].uv = (0.02, 0.02)
        s.groups.append((grp, s.n, len(bv))); s.n += len(bv)
    def done(s):
        me = bpy.data.meshes.new(s.name); s.bm.to_mesh(me); s.bm.free()
        ob = bpy.data.objects.new(s.name, me); scn.collection.objects.link(ob)
        for m in s.mats: ob.data.materials.append(MAT[m])
        for g, st, n in s.groups:
            vg = ob.vertex_groups.get(g) or ob.vertex_groups.new(name=g); vg.add(list(range(st, st + n)), 1.0, 'REPLACE')
        ob.parent = arm; md = ob.modifiers.new('Arm', 'ARMATURE'); md.object = arm
        return ob

def frustum(z0, z1, cx0, cy0, w0, d0, cx1, cy1, w1, d1, bev=0.0):
    def ring(z, cx, cy, w, d):
        if bev <= 0: return [(cx - w, cy - d, z), (cx + w, cy - d, z), (cx + w, cy + d, z), (cx - w, cy + d, z)]
        bw, bd = w * bev, d * bev
        return [(cx - w + bw, cy - d, z), (cx + w - bw, cy - d, z), (cx + w, cy - d + bd, z), (cx + w, cy + d - bd, z),
                (cx + w - bw, cy + d, z), (cx - w + bw, cy + d, z), (cx - w, cy + d - bd, z), (cx - w, cy - d + bd, z)]
    a = ring(z0, cx0, cy0, w0, d0); b = ring(z1, cx1, cy1, w1, d1); n = len(a)
    vs = a + b; fs = [list(range(n))[::-1], list(range(n, 2 * n))]
    for i in range(n): j = (i + 1) % n; fs.append([i, j, n + j, n + i])
    return vs, fs

# ---------- body ----------
b = B('Body')
TORSO = (0, 0, 0.90, 1.50, 0.0, 0.75)   # shirt texture: u 0..0.75 torso, v by height
b.part(frustum(0.90, 1.05, 0, 0, 0.17, 0.11, 0, 0, 0.18, 0.115, 0.35), 'shorts', 'hips')
b.part(frustum(1.03, 1.30, 0, 0, 0.175, 0.115, 0, 0, 0.195, 0.12, 0.35), 'shirt', 'spine', TORSO, True)
b.part(frustum(1.30, 1.40, 0, 0, 0.195, 0.12, 0, 0, 0.215, 0.125, 0.35), 'shirt', 'chest', TORSO, True)
b.part(frustum(1.40, 1.49, 0, 0, 0.215, 0.125, 0, 0.005, 0.20, 0.11, 0.35), 'shirt', 'chest', TORSO, True)
b.part(frustum(1.47, 1.52, 0, -0.005, 0.12, 0.08, 0, -0.005, 0.105, 0.072, 0.4), 'trim', 'chest')
b.part(frustum(1.49, 1.59, 0, 0.0, 0.055, 0.05, 0, 0.0, 0.05, 0.045, 0.4), 'skin', 'head')
# head (face front -Y)
b.part(frustum(1.56, 1.62, 0, -0.005, 0.07, 0.085, 0, 0.0, 0.088, 0.1, 0.45), 'skin', 'head')
b.part(frustum(1.62, 1.72, 0, 0.0, 0.088, 0.1, 0, 0.005, 0.094, 0.104, 0.45), 'skin', 'head')
b.part(frustum(1.72, 1.79, 0, 0.005, 0.094, 0.104, 0, 0.012, 0.08, 0.09, 0.45), 'skin', 'head')
for x in (-1, 1):
    b.part(frustum(1.64, 1.70, x * 0.098, 0.005, 0.012, 0.022, x * 0.1, 0.005, 0.012, 0.02), 'skin', 'head')            # ears
def headd(z):  # half depth of head front at height z
    pts = [(1.56, 0.085), (1.62, 0.10), (1.72, 0.104), (1.79, 0.09)]
    for (z0, d0), (z1, d1) in zip(pts, pts[1:]):
        if z0 <= z <= z1: return d0 + (d1 - d0) * (z - z0) / (z1 - z0)
    return 0.09
def headw(z):
    pts = [(1.56, 0.07), (1.62, 0.088), (1.72, 0.094), (1.79, 0.08)]
    for (z0, d0), (z1, d1) in zip(pts, pts[1:]):
        if z0 <= z <= z1: return d0 + (d1 - d0) * (z - z0) / (z1 - z0)
    return 0.08
FZ = [1.572, 1.62, 1.67, 1.72, 1.765]; FXF = [-0.88, -0.55, 0.0, 0.55, 0.88]
fv, ff = [], []
for z in FZ:
    w, d = headw(z), headd(z)
    for fx in FXF:
        x = fx * w; ax = abs(fx)
        y = -d if ax <= 0.55 else -d + d * 0.45 * (ax - 0.55) / 0.45
        fv.append((x, y - 0.0035, z))
nc = len(FXF)
for r in range(len(FZ) - 1):
    for c in range(nc - 1):
        i = r * nc + c; ff.append([i, i + 1, i + nc + 1, i + nc])
b.part((fv, ff), 'facepl', 'head', ('P', -0.0915, 0.0915, FZ[0], FZ[-1]))
b.part(frustum(1.635, 1.672, 0, -0.106, 0.012, 0.01, 0, -0.116, 0.01, 0.007), 'skin', 'head')   # nose
for s, x in (('L', 1), ('R', -1)):
    tx = 0.10 * x
    b.part(frustum(0.72, 0.97, tx, 0, 0.085, 0.09, tx, 0, 0.095, 0.10, 0.35), 'shorts', 'thigh.' + s)
    b.part(frustum(0.52, 0.73, tx, 0, 0.064, 0.07, tx, -0.005, 0.077, 0.082, 0.35), 'leg', 'thigh.' + s)
    b.part(frustum(0.44, 0.53, tx, 0, 0.062, 0.068, tx, 0, 0.066, 0.07, 0.35), 'socks', 'shin.' + s)
    b.part(frustum(0.40, 0.44, tx, 0, 0.064, 0.07, tx, 0, 0.064, 0.07, 0.35), 'trim', 'shin.' + s)
    b.part(frustum(0.10, 0.40, tx, 0.005, 0.042, 0.048, tx, 0.008, 0.062, 0.07, 0.35), 'socks', 'shin.' + s)
    b.part(frustum(0.0, 0.10, tx, -0.045, 0.048, 0.115, tx, -0.03, 0.045, 0.09, 0.3), 'boot', 'foot.' + s)
    ax = 0.235 * x
    SLV = (ax, 0, 1.25, 1.50, 0.75 + (0.125 if x > 0 else 0), 0.875 + (0.125 if x > 0 else 0))
    b.part(frustum(1.29, 1.49, ax + 0.008 * x, 0, 0.06, 0.06, ax, 0, 0.072, 0.072, 0.35), 'shirt', 'uarm.' + s, SLV)
    b.part(frustum(1.17, 1.30, ax + 0.012 * x, 0, 0.042, 0.045, ax + 0.008 * x, 0, 0.05, 0.052, 0.35), 'arm', 'uarm.' + s)
    b.part(frustum(0.99, 1.18, 0.258 * x, 0, 0.035, 0.038, 0.252 * x, 0, 0.042, 0.045, 0.35), 'arm', 'farm.' + s)
    b.part(frustum(0.89, 0.995, 0.262 * x, 0, 0.034, 0.045, 0.26 * x, 0, 0.038, 0.043, 0.35), 'glove', 'farm.' + s)
b.done()

# ---------- hair styles (one visible per player) ----------
h = B('hair_0')   # short
h.part(frustum(1.73, 1.815, 0, 0.012, 0.1, 0.11, 0, 0.02, 0.072, 0.082, 0.5), 'hair', 'head')
h.part(frustum(1.62, 1.75, 0, 0.058, 0.098, 0.06, 0, 0.06, 0.1, 0.062, 0.45), 'hair', 'head')
h.done()
h = B('hair_1')   # long
h.part(frustum(1.73, 1.825, 0, 0.01, 0.104, 0.114, 0, 0.02, 0.076, 0.086, 0.5), 'hair', 'head')
h.part(frustum(1.52, 1.76, 0, 0.06, 0.1, 0.064, 0, 0.055, 0.104, 0.068, 0.45), 'hair', 'head')
for x in (-1, 1): h.part(frustum(1.60, 1.76, x * 0.097, 0.0, 0.012, 0.07, x * 0.1, 0.0, 0.012, 0.09, 0.3), 'hair', 'head')
h.done()
h = B('hair_2')   # very short / buzz
h.part(frustum(1.735, 1.805, 0, 0.012, 0.097, 0.107, 0, 0.016, 0.08, 0.09, 0.5), 'hair', 'head')
h.part(frustum(1.63, 1.745, 0, 0.056, 0.097, 0.056, 0, 0.058, 0.098, 0.058, 0.45), 'hair', 'head')
h.done()
h = B('hair_3')   # curly / afro
h.part(frustum(1.70, 1.80, 0, 0.02, 0.112, 0.124, 0, 0.02, 0.124, 0.134, 0.55), 'hair', 'head')
h.part(frustum(1.80, 1.87, 0, 0.02, 0.124, 0.134, 0, 0.025, 0.09, 0.1, 0.55), 'hair', 'head')
h.part(frustum(1.62, 1.71, 0, 0.065, 0.1, 0.06, 0, 0.065, 0.112, 0.07, 0.45), 'hair', 'head')
h.done()
h = B('hair_4')   # bald (hidden mesh, tiny)
h.part(frustum(1.79, 1.795, 0, 0.012, 0.02, 0.02, 0, 0.012, 0.02, 0.02), 'skin', 'head')
h.done()
# ---------- linesman flag in right hand ----------
f = B('flag')
f.part(frustum(0.40, 0.96, -0.262, -0.02, 0.008, 0.008, -0.262, -0.02, 0.008, 0.008), 'pole', 'farm.R')
f.part(frustum(0.42, 0.62, -0.262, -0.03, 0.004, 0.0025, -0.262, -0.24, 0.004, 0.0025), 'flag', 'farm.R')
f.done()

bpy.context.view_layer.update()
exec(open('/home/claude/g3d/anims.py').read())
bpy.ops.export_scene.gltf(filepath=sys.argv[-1], export_format='GLB', export_animation_mode='ACTIONS', export_apply=False, export_yup=True, export_skins=True,
                          export_materials='EXPORT', export_image_format='NONE', export_texcoords=True, export_force_sampling=True, export_frame_step=1,
                          export_optimize_animation_size=True)
print('OK')
