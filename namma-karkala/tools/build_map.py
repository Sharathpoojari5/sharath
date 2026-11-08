#!/usr/bin/env python3
"""Turn an OpenStreetMap JSON extract (api/0.6/map.json) of Karkala into the game's map file.

Usage: python3 build_map.py osm.json ../data/karkala.json
Coordinates come out in game metres: x = east, z = south, squeezed by SCALE to fit a game.
"""
import json, math, sys

LAT0, LON0 = 13.2135, 74.9960           # roughly the bus stand / Market Road
BBOX = (13.1995, 74.9765, 13.2280, 75.0145)   # south, west, north, east
SCALE = 0.55
KX = 111320 * math.cos(math.radians(LAT0)) * SCALE
KZ = 110540 * SCALE

ROAD_W = {'trunk': 13, 'primary': 12, 'primary_link': 9, 'secondary': 10, 'tertiary': 9,
          'unclassified': 7, 'residential': 6.5, 'living_street': 6, 'service': 5, 'track': 4.5}


def xz(lat, lon):
    return [round((lon - LON0) * KX, 1), round(-(lat - LAT0) * KZ, 1)]


def inside(lat, lon, m=0.0):
    s, w, n, e = BBOX
    return s - m <= lat <= n + m and w - m <= lon <= e + m


def main(src, dst):
    o = json.load(open(src))
    els = o['elements']
    nodes = {e['id']: (e['lat'], e['lon']) for e in els if e['type'] == 'node'}
    out = {'attribution': 'Map data (c) OpenStreetMap contributors, ODbL. Squeezed x%.2f for the game.' % SCALE,
           'roads': [], 'water': [], 'rivers': [], 'green': [], 'buildings': [], 'pois': []}
    for w in (e for e in els if e['type'] == 'way'):
        t = w.get('tags', {})
        ids = [n for n in w['nodes'] if n in nodes]
        hw = t.get('highway')
        if hw in ROAD_W:
            run = []
            for n in ids + [None]:
                if n is not None and inside(*nodes[n]):
                    run.append(n)
                    continue
                if len(run) >= 2:
                    out['roads'].append({'cls': hw, 'w': ROAD_W[hw], 'name': t.get('name:en') or t.get('name') or '',
                                         'ids': run, 'pts': [xz(*nodes[i]) for i in run]})
                run = []
        elif t.get('natural') == 'water' or 'water' in t:
            pts = [xz(*nodes[n]) for n in ids]
            if any(inside(*nodes[n]) for n in ids):
                out['water'].append({'name': t.get('name', ''), 'pts': pts})
        elif t.get('waterway') in ('river', 'stream'):
            pts = [xz(*nodes[n]) for n in ids if inside(*nodes[n], 0.002)]
            if len(pts) >= 2:
                out['rivers'].append({'name': t.get('name', ''), 'pts': pts})
        elif t.get('leisure') in ('park', 'pitch', 'playground') or t.get('landuse') in ('grass', 'recreation_ground'):
            if all(inside(*nodes[n]) for n in ids):
                out['green'].append({'name': t.get('name', ''), 'kind': t.get('leisure') or t.get('landuse'), 'pts': [xz(*nodes[n]) for n in ids]})
        if 'building' in t or t.get('amenity') in ('place_of_worship', 'bus_station', 'college', 'school', 'police') or t.get('historic'):
            if ids and all(inside(*nodes[n]) for n in ids) and len(ids) >= 4:
                out['buildings'].append({'name': t.get('name:en') or t.get('name', ''), 'kind': t.get('amenity') or t.get('historic') or t.get('shop') or t.get('building'),
                                         'pts': [xz(*nodes[n]) for n in ids[:-1]]})
        if t.get('name') and 'highway' not in t and 'waterway' not in t:
            c = [sum(nodes[n][0] for n in ids) / len(ids), sum(nodes[n][1] for n in ids) / len(ids)] if ids else None
            if c and inside(*c):
                out['pois'].append({'name': t.get('name:en') or t['name'], 'kind': t.get('amenity') or t.get('leisure') or t.get('natural') or t.get('historic') or t.get('shop') or t.get('tourism') or '', 'p': xz(*c)})
    for e in (e for e in els if e['type'] == 'node'):
        t = e.get('tags', {})
        if t.get('name') and inside(e['lat'], e['lon']) and not t.get('place'):
            out['pois'].append({'name': t.get('name:en') or t['name'], 'kind': t.get('amenity') or t.get('historic') or t.get('natural') or t.get('tourism') or t.get('shop') or '', 'p': xz(e['lat'], e['lon'])})
    xs = [p[0] for r in out['roads'] for p in r['pts']]; zs = [p[1] for r in out['roads'] for p in r['pts']]
    out['bounds'] = [min(xs), min(zs), max(xs), max(zs)]
    json.dump(out, open(dst, 'w'), separators=(',', ':'))
    print('roads', len(out['roads']), 'water', len(out['water']), 'rivers', len(out['rivers']), 'green', len(out['green']),
          'buildings', len(out['buildings']), 'pois', len(out['pois']), 'bounds', out['bounds'])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
