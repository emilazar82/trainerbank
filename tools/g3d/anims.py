import math
BONES = [b.name for b in arm.pose.bones]
for pb in arm.pose.bones: pb.rotation_mode = 'XYZ'
arm.animation_data_create()
D = math.radians

def mirror(p):
    q = {}
    for k, v in p.items():
        if k == 'loc': q['loc'] = (-v[0], v[1], v[2]); continue
        n = k.replace('.L', '.X').replace('.R', '.L').replace('.X', '.R')
        q[n] = (v[0], -v[1], -v[2])
    return q

def anim(name, frames):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    arm.animation_data.action = act
    for f in sorted(frames):
        pose = frames[f]
        for pb in arm.pose.bones:
            r = pose.get(pb.name, (0, 0, 0))
            pb.rotation_euler = (D(r[0]), D(r[1]), D(r[2]))
            pb.keyframe_insert('rotation_euler', frame=f)
            if pb.name == 'root':
                pb.location = pose.get('loc', (0, 0, 0)); pb.keyframe_insert('location', frame=f)
    tr = arm.animation_data.nla_tracks.new(); tr.name = name
    st = tr.strips.new(name, int(min(frames)), act); tr.mute = True
    arm.animation_data.action = None

def P(**kw):
    d = {}
    for k, v in kw.items():
        if k == 'loc': d['loc'] = v; continue
        d[k.replace('_L', '.L').replace('_R', '.R')] = v
    return d

idle = P(chest=(3, 0, 0), uarm_L=(0, 0, -9), uarm_R=(0, 0, 9), farm_L=(-12, 0, 0), farm_R=(-12, 0, 0), thigh_L=(-2, 0, 3), thigh_R=(2, 0, -3), shin_L=(4, 0, 0), shin_R=(4, 0, 0))
idle2 = dict(idle); idle2['chest'] = (5, 0, 0); idle2['loc'] = (0, -0.012, 0); idle2['head'] = (-3, 4, 0)
anim('idle', {0: idle, 15: idle2, 30: idle})

def runc(a=1.0, lean=10):
    f0 = P(spine=(lean, 0, 0), chest=(4, -6 * a, 0), head=(-lean, 4 * a, 0), hips=(0, 6 * a, 0),
           thigh_L=(-42 * a, 0, 0), shin_L=(18 * a, 0, 0), foot_L=(-12 * a, 0, 0),
           thigh_R=(28 * a, 0, 0), shin_R=(75 * a, 0, 0), foot_R=(20 * a, 0, 0),
           uarm_L=(38 * a, 0, -10), farm_L=(-55, 0, 0), uarm_R=(-38 * a, 0, 10), farm_R=(-85, 0, 0), loc=(0, -0.02 * a, 0))
    f5 = P(spine=(lean, 0, 0), chest=(4, 0, 0), head=(-lean, 0, 0),
           thigh_L=(-6 * a, 0, 0), shin_L=(12 * a, 0, 0), thigh_R=(-24 * a, 0, 0), shin_R=(95 * a, 0, 0), foot_R=(10, 0, 0),
           uarm_L=(5, 0, -10), farm_L=(-70, 0, 0), uarm_R=(-5, 0, 10), farm_R=(-70, 0, 0), loc=(0, 0.045 * a, 0))
    return f0, f5
f0, f5 = runc(1.0, 11)
anim('run', {0: f0, 5: f5, 10: mirror(f0), 15: mirror(f5), 20: f0})
w0, w5 = runc(0.45, 3)
anim('walk', {0: w0, 8: w5, 16: mirror(w0), 24: mirror(w5), 32: w0})

anim('kick', {
    0: f5,
    5: P(spine=(6, 0, 0), thigh_R=(48, 0, 0), shin_R=(85, 0, 0), foot_R=(25, 0, 0), thigh_L=(-10, 0, 0), shin_L=(20, 0, 0),
         uarm_L=(-10, 0, -45), farm_L=(-20, 0, 0), uarm_R=(10, 0, 35), farm_R=(-20, 0, 0), loc=(0, -0.04, 0)),
    9: P(spine=(-10, 0, 0), chest=(-4, 0, 0), thigh_R=(-80, 0, 0), shin_R=(4, 0, 0), foot_R=(30, 0, 0), thigh_L=(-6, 0, 0), shin_L=(14, 0, 0),
         uarm_L=(-25, 0, -65), farm_L=(-15, 0, 0), uarm_R=(25, 0, 40), farm_R=(-20, 0, 0), loc=(0, -0.02, 0.05)),
    13: P(spine=(-8, 0, 0), thigh_R=(-62, 0, 0), shin_R=(14, 0, 0), thigh_L=(-4, 0, 0), shin_L=(10, 0, 0),
          uarm_L=(-10, 0, -45), uarm_R=(10, 0, 30), farm_L=(-20, 0, 0), farm_R=(-20, 0, 0), loc=(0, 0, 0.08)),
    20: dict(idle, loc=(0, 0, 0.1))})

anim('header', {
    0: idle,
    5: P(spine=(14, 0, 0), thigh_L=(-35, 0, 0), thigh_R=(-35, 0, 0), shin_L=(70, 0, 0), shin_R=(70, 0, 0), foot_L=(-25, 0, 0), foot_R=(-25, 0, 0),
         uarm_L=(30, 0, -25), uarm_R=(30, 0, 25), farm_L=(-40, 0, 0), farm_R=(-40, 0, 0), loc=(0, -0.16, 0)),
    10: P(spine=(-14, 0, 0), head=(-22, 0, 0), thigh_L=(8, 0, 0), thigh_R=(-10, 0, 0), shin_L=(40, 0, 0), shin_R=(25, 0, 0), foot_L=(30, 0, 0), foot_R=(30, 0, 0),
          uarm_L=(-60, 0, -40), uarm_R=(-60, 0, 40), farm_L=(-50, 0, 0), farm_R=(-50, 0, 0), loc=(0, 0.42, 0)),
    13: P(spine=(18, 0, 0), chest=(8, 0, 0), head=(26, 0, 0), thigh_L=(-4, 0, 0), thigh_R=(-15, 0, 0), shin_L=(30, 0, 0), shin_R=(35, 0, 0),
          uarm_L=(-30, 0, -50), uarm_R=(-30, 0, 50), farm_L=(-30, 0, 0), farm_R=(-30, 0, 0), loc=(0, 0.38, 0)),
    17: P(spine=(10, 0, 0), thigh_L=(-25, 0, 0), thigh_R=(-25, 0, 0), shin_L=(50, 0, 0), shin_R=(50, 0, 0), uarm_L=(0, 0, -30), uarm_R=(0, 0, 30), loc=(0, -0.1, 0)),
    22: idle})

sl = lambda z: P(loc=(0, -0.29, z), root=(-62, 0, 0), spine=(22, 0, 0), chest=(8, 0, 0), head=(22, 0, 0), thigh_R=(-28, 0, 0), shin_R=(0, 0, 0), foot_R=(-10, 0, 0),
          thigh_L=(-45, 0, 0), shin_L=(110, 0, 0), uarm_L=(-20, 0, -70), farm_L=(-20, 0, 0), uarm_R=(30, 0, 60), farm_R=(-20, 0, 0))
anim('slide', {0: f5, 5: P(loc=(0, -0.1, 0.45), root=(-28, 0, 0), thigh_R=(-35, 0, 0), shin_R=(10, 0, 0), thigh_L=(0, 0, 0), shin_L=(60, 0, 0), uarm_L=(0, 0, -40), uarm_R=(0, 0, 40)),
               10: sl(1.1), 18: sl(1.7), 26: sl(1.8)})

ready = P(spine=(18, 0, 0), head=(-14, 0, 0), thigh_L=(-28, 0, 8), thigh_R=(-28, 0, -8), shin_L=(55, 0, 0), shin_R=(55, 0, 0), foot_L=(-20, 0, 0), foot_R=(-20, 0, 0),
          uarm_L=(-35, 0, -28), uarm_R=(-35, 0, 28), farm_L=(-35, 0, 0), farm_R=(-35, 0, 0), loc=(0, -0.12, 0))
anim('keeper', {0: ready, 15: dict(ready, loc=(0, -0.14, 0)), 30: ready})
dl = {
    0: ready,
    4: P(spine=(8, 0, 0), thigh_L=(-40, 0, 25), thigh_R=(-15, 0, -5), shin_L=(70, 0, 0), shin_R=(30, 0, 0), uarm_L=(-90, 0, -40), uarm_R=(-90, 0, 40), loc=(0.15, -0.18, 0), root=(0, 0, -15)),
    11: P(root=(0, 0, -78), loc=(1.15, 0.55, 0), spine=(0, 0, -8), head=(0, 0, -10), uarm_L=(-170, 0, -10), uarm_R=(-165, 0, 10), farm_L=(-5, 0, 0), farm_R=(-5, 0, 0),
          thigh_L=(-15, 0, 10), thigh_R=(10, 0, -5), shin_L=(25, 0, 0), shin_R=(45, 0, 0)),
    18: P(root=(0, 0, -92), loc=(1.55, 0.14, 0), uarm_L=(-170, 0, -10), uarm_R=(-165, 0, 10), thigh_L=(-10, 0, 5), shin_L=(25, 0, 0), shin_R=(40, 0, 0)),
    26: P(root=(0, 0, -92), loc=(1.6, 0.12, 0), uarm_L=(-150, 0, -20), uarm_R=(-140, 0, 20), farm_L=(-40, 0, 0), farm_R=(-40, 0, 0), thigh_L=(-30, 0, 0), shin_L=(60, 0, 0), shin_R=(40, 0, 0))}
anim('dive_l', dl)
anim('dive_r', {k: mirror(v) for k, v in dl.items()})
anim('catch', {0: ready, 6: P(spine=(25, 0, 0), thigh_L=(-35, 0, 0), thigh_R=(-35, 0, 0), shin_L=(60, 0, 0), shin_R=(60, 0, 0), uarm_L=(-75, 0, 15), uarm_R=(-75, 0, -15), farm_L=(-70, 0, 0), farm_R=(-70, 0, 0), loc=(0, -0.12, 0)),
               14: P(spine=(10, 0, 0), uarm_L=(-60, 0, 25), uarm_R=(-60, 0, -25), farm_L=(-95, 0, 0), farm_R=(-95, 0, 0))})
anim('jump', {0: ready, 6: P(uarm_L=(-170, 0, -5), uarm_R=(-170, 0, 5), thigh_L=(10, 0, 0), shin_L=(40, 0, 0), shin_R=(20, 0, 0), loc=(0, 0.5, 0)),
              12: P(uarm_L=(-165, 0, -5), uarm_R=(-165, 0, 5), loc=(0, 0.45, 0)), 20: ready})

c0 = P(uarm_L=(-150, 0, 40), uarm_R=(-150, 0, -40), farm_L=(-12, 0, 0), farm_R=(-12, 0, 0), head=(-15, 0, 0), spine=(-6, 0, 0), loc=(0, 0, 0))
c1 = P(uarm_L=(-140, 0, 58), uarm_R=(-140, 0, -58), farm_L=(-25, 0, 0), farm_R=(-25, 0, 0), head=(-25, 0, 0), spine=(-10, 0, 0), thigh_L=(-30, 0, 0), shin_L=(60, 0, 0), thigh_R=(10, 0, 0), shin_R=(40, 0, 0), loc=(0, 0.28, 0))
anim('cheer', {0: c0, 6: c1, 12: c0, 18: mirror(c1), 24: c0})

fallb = {0: idle,
         4: P(root=(-25, 0, 0), spine=(15, 0, 0), uarm_L=(-60, 0, -50), uarm_R=(-70, 0, 50), thigh_L=(-30, 0, 0), shin_L=(40, 0, 0), loc=(0, 0, -0.1)),
         10: P(root=(-80, 0, 0), spine=(10, 0, 0), head=(15, 0, 0), uarm_L=(-40, 0, -70), uarm_R=(-30, 0, 60), thigh_L=(-40, 0, 0), shin_L=(50, 0, 0), loc=(0, 0.1, -0.35)),
         14: P(root=(-90, 0, 0), head=(8, 0, 0), uarm_L=(-10, 0, -60), uarm_R=(-10, 0, 55), thigh_L=(-30, 0, 0), shin_L=(50, 0, 0), loc=(0, 0.09, -0.45))}
anim('fall', fallb)
fallf = {0: idle,
         4: P(root=(25, 0, 0), spine=(10, 0, 0), uarm_L=(-60, 0, -30), uarm_R=(-60, 0, 30), thigh_R=(30, 0, 0), shin_R=(60, 0, 0), loc=(0, 0, 0.1)),
         10: P(root=(82, 0, 0), head=(-30, 0, 0), uarm_L=(-120, 0, -30), uarm_R=(-120, 0, 30), farm_L=(-30, 0, 0), farm_R=(-30, 0, 0), thigh_R=(20, 0, 0), shin_R=(40, 0, 0), loc=(0, 0.1, 0.35)),
         14: P(root=(90, 0, 0), head=(-25, 0, 0), uarm_L=(-150, 0, -20), uarm_R=(-150, 0, 20), farm_L=(-40, 0, 0), farm_R=(-40, 0, 0), loc=(0, 0.1, 0.45))}
anim('fallf', fallf)
hb = P(root=(-90, 0, 0), head=(15, 0, 0), thigh_R=(-70, 0, 0), shin_R=(100, 0, 0), thigh_L=(-20, 0, 0), shin_L=(30, 0, 0), uarm_L=(-70, 0, -5), uarm_R=(-75, 0, 5), farm_L=(-80, 0, 0), farm_R=(-80, 0, 0), loc=(0, 0.09, -0.45))
hb2 = dict(hb); hb2['root'] = (-90, 0, 10); hb2['thigh.R'] = (-80, 0, 0)
anim('hurt', {0: hb, 15: hb2, 30: hb})
hf = P(root=(90, 0, 0), head=(-30, 20, 0), uarm_L=(-150, 0, -20), uarm_R=(-150, 0, 20), farm_L=(-50, 0, 0), farm_R=(-50, 0, 0), thigh_L=(10, 0, 0), shin_L=(70, 0, 0), loc=(0, 0.1, 0.45))
hf2 = dict(hf); hf2['shin.L'] = (40, 0, 0); hf2['head'] = (-30, -20, 0)
anim('hurtf', {0: hf, 15: hf2, 30: hf})
anim('push', {0: idle, 4: P(spine=(15, 0, 0), uarm_L=(-85, 0, 10), uarm_R=(-85, 0, -10), farm_L=(-5, 0, 0), farm_R=(-5, 0, 0), thigh_L=(-30, 0, 0), shin_L=(30, 0, 0), loc=(0, 0, 0.15)),
              10: P(spine=(8, 0, 0), uarm_L=(-60, 0, 0), uarm_R=(-60, 0, 0), farm_L=(-30, 0, 0), farm_R=(-30, 0, 0), loc=(0, 0, 0.2)), 16: dict(idle, loc=(0, 0, 0.2))})
anim('card', {0: idle, 5: P(uarm_R=(-175, 0, 0), farm_R=(-5, 0, 0), uarm_L=(0, 0, -10), head=(-5, 0, 0)), 30: P(uarm_R=(-175, 0, 0), farm_R=(-5, 0, 0), uarm_L=(0, 0, -10))})
anim('carry', {0: P(spine=(30, 0, 0), uarm_L=(-60, 0, 0), uarm_R=(-60, 0, 0), farm_L=(-20, 0, 0), farm_R=(-20, 0, 0), thigh_L=(-20, 0, 0), shin_L=(30, 0, 0), thigh_R=(10, 0, 0), shin_R=(30, 0, 0)),
               10: P(spine=(30, 0, 0), uarm_L=(-60, 0, 0), uarm_R=(-60, 0, 0), farm_L=(-20, 0, 0), farm_R=(-20, 0, 0), thigh_L=(10, 0, 0), shin_L=(30, 0, 0), thigh_R=(-20, 0, 0), shin_R=(30, 0, 0)),
               20: P(spine=(30, 0, 0), uarm_L=(-60, 0, 0), uarm_R=(-60, 0, 0), farm_L=(-20, 0, 0), farm_R=(-20, 0, 0), thigh_L=(-20, 0, 0), shin_L=(30, 0, 0), thigh_R=(10, 0, 0), shin_R=(30, 0, 0))})
mh = P(uarm_L=(-150, 0, -45), uarm_R=(-150, 0, 45), farm_L=(-120, 0, 0), farm_R=(-120, 0, 0), head=(10, 0, 0), spine=(4, 0, 0))
mh2 = dict(mh); mh2['head'] = (14, 12, 0); mh2['spine'] = (8, 0, 0)
anim('miss', {0: idle, 8: mh, 24: mh2, 40: mh})
ax = P(uarm_L=(-14, 64, 10), uarm_R=(-14, -64, -10), farm_L=(-94, 0, 0), farm_R=(-86, 0, 0), chest=(-3, 0, 0), head=(-4, 0, 0), thigh_L=(0, 0, 5), thigh_R=(0, 0, -5))
ax2 = dict(ax); ax2['chest'] = (-1, 0, 0); ax2['loc'] = (0, -0.008, 0)
anim('armsx', {0: ax, 20: ax2, 40: ax})
kn = P(loc=(0, -0.43, 0), spine=(8, 0, 0), thigh_L=(-88, 0, 4), shin_L=(88, 0, 0), foot_L=(0, 0, 0), thigh_R=(-2, 0, -4), shin_R=(92, 0, 0), foot_R=(45, 0, 0),
       uarm_L=(-35, 0, -8), farm_L=(-40, 0, 0), uarm_R=(-15, 20, 12), farm_R=(-70, 0, 0), head=(-4, 0, 0))
kn2 = dict(kn); kn2['loc'] = (0, -0.435, 0)
anim('kneel', {0: kn, 20: kn2, 40: kn})
li = P(uarm_L=(-172, 0, -12), uarm_R=(-172, 0, 12), farm_L=(-25, 0, 0), farm_R=(-25, 0, 0), head=(-18, 0, 0), spine=(-5, 0, 0))
li2 = dict(li); li2['loc'] = (0, 0.18, 0); li2['uarm.L'] = (-176, 0, -6); li2['uarm.R'] = (-176, 0, 6); li2['thigh.L'] = (-20, 0, 0); li2['shin.L'] = (40, 0, 0); li2['shin.R'] = (25, 0, 0)
anim('lift', {0: li, 8: li2, 16: li})
wv = P(uarm_R=(-20, 0, 150), farm_R=(-30, 0, 0), uarm_L=(0, 0, -8), farm_L=(-12, 0, 0), head=(-6, -8, 0))
wv2 = dict(wv); wv2['farm.R'] = (-5, 0, 0); wv2['uarm.R'] = (-20, 0, 135)
anim('wave', {0: wv, 10: wv2, 20: wv})
