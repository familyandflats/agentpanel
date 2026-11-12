#!/usr/bin/env python3
"""Family&Flats: project pages on Golf Course Extension Road in the IREO Victory Valley design.

  python scripts/generate-project-pages.py                 write every project in scripts/project-pages.json
  python scripts/generate-project-pages.py ireograndarch   only that project
  python scripts/generate-project-pages.py --check         report pages that are out of date (exit 1)
  python scripts/generate-project-pages.py --out DIR       write to DIR instead (preview)

Uses the Victory Valley page's own styles and scripts (hero collage + photo viewer, FAQ accordion,
enquiry form), so every project page looks the same. Facts come only from scripts/project-pages.json.
Afterwards run inject-shell.py --apply (rule 2.9), then the deploy check.
"""
import hashlib, html, json, os, re, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SITE = 'https://familyandflats.com'
WA = '919899273673'
V = 'pj4'
STAGES = {
    'new-launch': ('New launch', 'vvb-pill-new'),
    'under-construction': ('Under construction', 'vvb-pill-uc'),
    'possession': ('Possession started', 'vvb-pill-pos'),
    'ready': ('Ready to move', 'vvb-pill-good'),
}
E = lambda s: html.escape(str(s or ''), quote=True)
args = [a for a in sys.argv[1:]]
CHECK = '--check' in args
OUT = args[args.index('--out') + 1] if '--out' in args else None
only = [a for a in args if not a.startswith('--') and a != OUT]

data = json.load(open(os.path.join(ROOT, 'scripts', 'project-pages.json'), encoding='utf-8'))['projects']
# The Victory Valley page keeps part of its look in <style> blocks in its <head>: copy them, so both pages stay the same.
_vv = open(os.path.join(ROOT, 'projects/ireo-victory-valley/index.html'), encoding='utf-8').read()
VV_STYLES = '\n'.join(re.findall(r'<style[^>]*>.*?</style>', _vv.split('</head>')[0], re.S))


def road_projects():
    """sector -> [(url, name, meta, img)] from the Golf Course Extension Road page."""
    s = open(os.path.join(ROOT, 'locations/golf-course-extension-road-gurugram/index.html'), encoding='utf-8').read()
    out = {}
    for m in re.finditer(r'<div class="ffloc-sector" id="sector-([0-9a-z]+)">(.*?)</div>\s*</div>', s, re.S):
        sec = m.group(1).upper()
        for c in re.finditer(r'<a class="ffloc-proj[^"]*" href="([^"]+)">(.*?)</a>', m.group(2), re.S):
            img = re.search(r'<img src="([^"]+)"', c.group(2))
            b = re.search(r'<b>(.*?)</b>', c.group(2))
            meta = re.search(r'</b><span>(.*?)</span>', c.group(2))
            out.setdefault(sec, []).append((c.group(1), html.unescape(b.group(1)) if b else '', html.unescape(meta.group(1)) if meta else '', img.group(1) if img else ''))
    return out


def sec_num(s):
    m = re.match(r'(\d+)([A-Z]?)', s)
    return int(m.group(1)) + (0.5 if m.group(2) else 0) if m else 999


def nearby(slug, sector, road, n=6):
    rows = []
    for sec, items in road.items():
        for it in items:
            if it[0].strip('/').split('/')[-1] == slug:
                continue
            rows.append((abs(sec_num(sec) - sec_num(sector)), sec_num(sec), sec, it))
    rows.sort(key=lambda r: (r[0], r[1], r[3][1]))
    return [(r[2],) + r[3] for r in rows[:n]]


def photo(slug, f, alt):
    rel = f'projects/{slug}/images/{f}'
    p = os.path.join(ROOT, rel)
    im = Image.open(p)
    w, h = im.size
    small = None
    if w > 900:  # an 800 px copy for tiles and phones, like the Victory Valley photos
        base, ext = os.path.splitext(f)
        sf = f'{base}-800.jpg'
        sp = os.path.join(ROOT, f'projects/{slug}/images/{sf}')
        if not os.path.exists(sp) and not CHECK and not OUT:
            im.convert('RGB').resize((800, round(h * 800 / w))).save(sp, quality=82, optimize=True, progressive=True)
        if os.path.exists(sp) or OUT:
            small = f'/projects/{slug}/images/{sf}'
    return {'src': '/' + rel, 'w': w, 'h': h, 'alt': alt, 'sm': small or '/' + rel}


STAGE_WORD = {'ready': 'ready-to-move', 'possession': 'newly completed', 'under-construction': 'under-construction', 'new-launch': 'newly launched'}
HELP = [["fa-camera", "Photos before you visit", "Current photos or a video of the actual flat on WhatsApp."],
        ["fa-user-check", "Checked with the owner", "Availability, floor and price confirmed before any visit."],
        ["fa-scale-balanced", "Price context", "What similar homes in the project ask and sell for."],
        ["fa-handshake", "One advisor to closing", "Visit, negotiation and paperwork with one Family&Flats advisor."]]


def bhk_text(b):
    return ', '.join(b[:-1]) + ' and ' + b[-1] if len(b) > 1 else (b[0] if b else '')


def are_ads():
    """Anant Raj Estate ads (assets/data/anant-raj-ads.js), minus the same held-back misreads as the Buy/Rent pages."""
    src = open(os.path.join(ROOT, 'assets/data/anant-raj-ads.js'), encoding='utf-8').read()
    ads = json.loads(src[src.index('['):src.rindex(']') + 1])
    out = []
    for a in ads:
        if a['kind'] == 'Plot' and a.get('cr') and a.get('plot') and not (2 <= a['cr'] * 100 / a['plot'] <= 5):
            continue
        if a['kind'] == 'Independent floor' and a.get('bhk') == 1:
            continue
        out.append(a)
    return out, hashlib.md5(src.encode('utf-8')).hexdigest()[:8]


def are_texts(P):
    """Lead, about, facts and FAQs for Anant Raj Estate; price ranges are worked out from the listings on the page."""
    ads, _ = are_ads()
    fl = lambda b: [a['cr'] for a in ads if a['kind'] == 'Independent floor' and a['txn'] == 'Sale' and a.get('bhk') == b and a.get('cr')]
    rent = [a['rentL'] for a in ads if a['kind'] == 'Independent floor' and a['txn'] == 'Rent' and a.get('rentL')]
    rates = [a.get('rateL') or a['cr'] * 100 / a['plot'] for a in ads if a['kind'] == 'Plot' and (a.get('rateL') or (a.get('cr') and a.get('plot')))]
    sizes = [a['plot'] for a in ads if a['kind'] == 'Plot' and a.get('plot')]
    n = lambda k, t=None: sum(1 for a in ads if a['kind'] == k and (t is None or a['txn'] == t))
    num = lambda v: f"{v:.2f}".rstrip('0').rstrip('.')
    rng = lambda v: f"₹{num(min(v))}–{num(max(v))} Cr"
    faqs = [["What kind of property is there in Anant Raj Estate?", "Anant Raj Estate in Sector 63A is a large plotted community on Golf Course Extension Road with residential plots, villas and independent floors. Builders build about four floors on one plot, and each floor is sold or rented on its own."]]
    if fl(3) or fl(4):
        faqs.append(["What is the price of an independent floor in Anant Raj Estate?", "In the listings on this page, " + " and ".join(f"{b} BHK floors are asked at about {rng(fl(b))}" for b in (3, 4) if fl(b)) + ". Plot size, floor, terrace rights and basement share change the price; Family&Flats confirms the final price with the owner side before your visit."])
    if rent:
        faqs.append(["What is the rent for a floor in Anant Raj Estate?", f"Floors listed for rent on this page are asked at about ₹{int(round(min(rent) * 1e5)):,}–{int(round(max(rent) * 1e5)):,} a month. Maintenance, deposit and furnishing terms vary; we confirm them before your visit."])
    if rates:
        faqs.append(["What is the price of a plot in Anant Raj Estate?", f"Plots on this page are asked at about ₹{min(rates):.2f}–{max(rates):.2f} lakh per sq yd. Plot sizes listed range from {min(sizes)} to {max(sizes)} sq yd. Corner, park-facing and road-width differences change the rate."])
    faqs += [["Can I see photos or a video before visiting?", "Yes. For serious enquiries, Family&Flats shares current photos or a video of the actual floor, villa or plot on WhatsApp, so you only visit what fits."],
             ["I own a floor, villa or plot in Anant Raj Estate. Can you help me sell or rent it?", "Yes. Share the block, plot size and floor with us on WhatsApp or in the form below. We suggest a realistic price and market it to verified buyers or tenants."],
             ["Where is Anant Raj Estate?", "Sector 63A on Golf Course Extension Road, Gurugram (Gurgaon), Haryana."],
             ["Who do I deal with?", "Always Family&Flats. We check availability, price and floor with the owner or agent, arrange the visit and support you through negotiation and paperwork."]]
    counts = f"{n('Independent floor', 'Sale')} floors for sale, {n('Independent floor', 'Rent')} for rent, {n('Plot')} plots and {n('Villa')} villas"
    lead = f"A ready plotted community by {P['developer']} in Sector 63A on Golf Course Extension Road. Listed now: {counts}. We check each one with the owner side before any visit."
    about = (f"Anant Raj Estate is a ready plotted community by {P['developer']} in Sector 63A on Golf Course Extension Road, Gurugram, with residential plots, villas and independent floors. "
             "On an independent floor plot a builder usually builds about four floors, and each is sold or rented on its own: upper ground (often with a basement share), middle floors and a top floor, sometimes with terrace rights. "
             "Listings come from agents' current offers, read and checked by Family&Flats; price on request means we get the price for you.")
    facts = [["Developer", P['developer']], ["Location", "Sector 63A, Golf Course Extension Road"], ["Size", P.get('size') or "Ask us"],
             ["Homes", "Independent floors, villas and plots"], ["Status", "Ready to move"], ["Completed", P.get('possession') or "Ask us"]]
    return lead, about, facts, faqs


def texts(P):
    """Lead, about, facts and FAQs, written only from the facts in project-pages.json."""
    name, sec, dev, st = P['name'], P['sector'], P['developer'], P.get('stage') or ''
    homes = bhk_text(P['bhk']).replace(' BHK and', ' and').replace(' BHK,', ',') if P['bhk'] else ''
    kind = P.get('kind') or 'homes'
    uc = st in ('under-construction', 'new-launch')
    word = STAGE_WORD.get(st, '')
    art = lambda w: ('an ' if w[:1] in 'aeiou' else 'a ') + w
    lead = f"{art(word + ' ' + dev) if word else art(dev)} project in Sector {sec} on Golf Course Extension Road: {homes} {kind}. "
    lead = lead[0].upper() + lead[1:]
    if uc:
        lead += "Buy from the developer or take over an existing booking; we share the current price and payment plan."
    else:
        lead += "Tell us what you need: we check current homes with owners and send photos before any visit."
    about = f"{name} is {art(word + ' residential') if word else 'a residential'} project by {dev} in Sector {sec} on Golf Course Extension Road, Gurugram. "
    if P.get('size'):
        about += f"{P['size']}. "
    about += f"Homes are {homes} {kind}. "
    if P.get('aboutExtra'):
        about += P['aboutExtra'] + ' '
    if st == 'possession':
        about += f"Possession has started ({P['possession']}), so homes are brand new, sold by first owners and by the developer where units are left. "
    elif uc:
        about += f"Expected possession: {P['possession']}. "
    about += "Details are from public listings and RERA filings; Family&Flats confirms them before any visit."
    label = STAGES.get(st, ('Ask us', ''))[0]
    # Same rows, in the same order, for every project in a category; a missing fact says "Ask us".
    facts = [["Developer", dev], ["Location", f"Sector {sec}, Golf Course Extension Road"],
             ["Size", P.get('size') or "Ask us"], ["Homes", f"{homes} {kind}"],
             ["Status", label if st else "Ask us for the current status"]]
    if st == 'ready':
        facts.append(["Completed", P.get('possession') or "Ask us"])
    else:
        facts.append(["Possession", P.get('possession') or "Ask us"])
        facts.append(["RERA no.", P.get('rera') or "Ask us: we check it on HARERA"])
    faqs = []
    if st == 'ready':
        faqs.append([f"Is {name} ready to move?", f"Yes. {name} is a completed project in Sector {sec}, Gurugram, so homes here are resales and rentals with no construction wait. Family&Flats confirms each home with the owner before you visit."])
    elif st == 'possession':
        faqs.append([f"Has possession started in {name}?", f"Yes. Possession started ({P['possession']}). Homes are brand new: some are sold or rented by first owners, and the developer may still have units. We confirm which before a visit."])
    elif uc:
        faqs.append([f"When is possession of {name}?", f"Expected possession is {P['possession']}. Dates can move, so we share the latest from the developer and the RERA filing before you book."])
        faqs.append([f"Can I buy a resale (transfer) in {name}?", "Yes. Some buyers sell their booking before possession. We check what they paid, what is still due to the developer and the transfer charges, so you compare it with a fresh booking."])
    else:
        faqs.append([f"What is the current status of {name}?", "Ask us: we confirm the current stage, possession and availability with the developer and owners before you visit."])
    if st != 'ready':
        faqs.append([f"What is the RERA number of {name}?", f"{P['rera']}. You can check it on the Haryana RERA (Gurugram) portal." if P.get('rera') else "We confirm the RERA registration on the Haryana RERA (Gurugram) portal and share it before you book."])
    faqs.append([f"What homes are there in {name}?", f"{homes} {kind}. Sizes, floors and views vary; tell us what you need and we share current options."])
    faqs.append([f"Where is {name}?", f"Sector {sec} on Golf Course Extension Road, Gurugram (Gurgaon), Haryana."])
    faqs.append(["Can I see photos or a video before visiting?", "Yes. For serious enquiries, Family&Flats shares current photos or a video of the actual home on WhatsApp, so you only visit the homes that fit."])
    if not uc:
        faqs.append([f"I own a home in {name}. Can you help me sell or rent it?", "Yes. Share the details privately and Family&Flats will suggest a realistic price, market it to verified buyers or tenants, and handle the enquiries."])
    faqs.append(["Who do I deal with?", "Always Family&Flats. We confirm availability and details, arrange the visit and support you through negotiation and closing."])
    return lead, about, facts, faqs


def page(slug, P, road):
    name, sector = P['name'], P['sector']
    st = P.get('stage') or ''
    uc = st in ('under-construction', 'new-launch')
    url = f'{SITE}/projects/{slug}/'
    stage = STAGES.get(st)
    are = P.get('inventory') == 'are'
    lead, about, facts, faqs = are_texts(P) if are else texts(P)
    if are:
        ads_, _ = are_ads()
        cnt = lambda k, t=None: sum(1 for a in ads_ if a['kind'] == k and (t is None or a['txn'] == t))
        f3 = [a['cr'] for a in ads_ if a['kind'] == 'Independent floor' and a['txn'] == 'Sale' and a.get('bhk') == 3 and a.get('cr')]
        P = dict(P, glance=P.get('glance') or [["Developer", P['developer']], ["Homes", "Independent floors, villas and plots"],
                                              ["Listed now", f"{len(ads_)} floors, villas and plots"], ["Sector", "63A, Golf Course Extension Road"]],
                 desc=P.get('desc') or (f"{cnt('Independent floor', 'Sale')} independent floors for sale, {cnt('Independent floor', 'Rent')} for rent, {cnt('Plot')} plots and {cnt('Villa')} villas in Anant Raj Estate, Sector 63A, Golf Course Extension Road, Gurgaon."
                                        + (f" 3 BHK floors from \u20b9{min(f3):g} Cr." if f3 else "") + " Every enquiry handled by Family&Flats."))
    none_text = ("We share the developer's current price list and payment plan, and any bookings being resold (transfers), with what is still due. Tell us the BHK and budget." if uc else f"We have contacts in {E(name)}. Tell us the BHK and budget, and we check current homes with owners, then send photos, floor and final price on WhatsApp before any visit.")
    P = dict(P, lead=P.get('lead') or lead, about=P.get('about') or about, facts=P.get('facts') or facts, faqs=P.get('faqs') or faqs,
             pills=P.get('pills') or ([P['size'].split(',')[0]] if P.get('size') else []) + [bhk_text(P['bhk'])],
             amenities=P.get('amenities'))
    photos = [photo(slug, f, a) for f, a in P['photos']]
    n = len(photos)
    big = photos[0] if photos else None
    t1, t2 = (photos[1] if n > 1 else None), (photos[2] if n > 2 else None)
    more = n - 3
    title = f'{name} Sector {sector} Gurgaon | ' + ('New Booking & Resale' if uc else 'Resale & Rent Flats')
    if len(title) > 60:
        title = f'{name} Sector {sector} Gurgaon | Family&Flats'
    if len(title) > 60:
        title = f'{name} Sector {sector} | Family&Flats'
    desc = f"{name}, Sector {sector}, Golf Course Extension Road, Gurgaon: {bhk_text(P['bhk'])} {P.get('kind') or ''}{', ' + stage[0].lower() if stage else ''}. Checked with owners, photos before you visit."
    desc = re.sub(r'\s+', ' ', P.get('desc') or desc)[:160]
    title = P.get('title') or title
    pills = ''.join([f'<li class="{stage[1]}">{E(stage[0])}</li>'] if stage else []) + ''.join(f'<li>{E(p)}</li>' for p in P['pills'] if p)
    near = nearby(slug, sector, road)
    gallery = [{'src': p['src'], 'w': p['w'], 'h': p['h'], 'alt': p['alt']} for p in photos]
    og = SITE + (big['src'] if big else '/projects/ireovictoryvalley/images/ff-vv-ov-04.jpg')
    wa_text = f'Hi Family&Flats, I am looking for a flat in {name}, Sector {sector}.'
    from urllib.parse import quote
    cat = st or 'none'
    photo_btn = lambda i, p, big_: (f'<button type="button" class="vv-tile{" vv-tile-big" if big_ else ""}" data-i="{i}" aria-label="Open photo {i + 1} of {n}: {E(p["alt"])}">'
        + (f'<img src="{p["src"]}" srcset="{p["sm"]} 800w, {p["src"]} {p["w"]}w" sizes="(max-width:900px) 100vw, 680px" alt="{E(p["alt"])}" width="{p["w"]}" height="{p["h"]}" fetchpriority="high">' if big_
           else f'<img src="{p["sm"]}" alt="{E(p["alt"])}" width="{p["w"]}" height="{p["h"]}" loading="lazy">')
        + (f'<span class="vv-more">+{n - 3} photos</span>' if i == 2 and n > 3 else '') + '</button>')
    glance = P.get('glance') or [["Developer", P['developer']], ["Size", P.get('size') or "Ask us"], ["Homes", f"{bhk_text(P['bhk'])} {P.get('kind') or 'homes'}"], ["Sector", f"{sector}, Golf Course Extension Road"]]
    tile_glance = (f'<div class="vv-tile vv-tile-big pjb-info pjb-info-big pjb-c-{cat}"><p class="pjb-info-k">At a glance</p>'
        f'<dl>{"".join(f"<div><dt>{E(k)}</dt><dd>{E(v)}</dd></div>" for k, v in glance)}</dl>'
        f'<p class="pjb-info-n">Photos after our next visit</p></div>')
    when_v = P.get("possession") or "Ask us"
    if st != 'ready':
        when_v = "Possession: " + when_v
    tile_stage = (f'<div class="vv-tile pjb-info pjb-c-{cat}"><p class="pjb-info-k">{E(stage[0]) if stage else "Status"}</p>'
        f'<p class="pjb-info-v">{E(when_v if st else "Ask us for the current stage")}</p></div>')
    tile_wa = (f'<a class="vv-tile pjb-info pjb-info-wa" href="https://wa.me/{WA}?text={quote(wa_text)}" target="_blank" rel="noopener">'
        f'<p class="pjb-info-k"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Photos on WhatsApp</p>'
        f'<p class="pjb-info-v">Ask for current photos of a home</p></a>')
    slots = [photo_btn(0, big, True) if n else tile_glance]
    slots.append(photo_btn(1, t1, False) if n > 1 else tile_stage)
    slots.append(photo_btn(2, t2, False) if n > 2 else tile_wa)
    visual = f'<div class="vv-collage pjb-c-{cat}" role="group" aria-label="{E(name)} photos">' + ''.join(slots) + '</div>'
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'WebPage', '@id': url + '#webpage', 'url': url, 'name': title, 'description': desc, 'isPartOf': {'@type': 'WebSite', 'name': 'Family&Flats', 'url': SITE + '/'}},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Golf Course Extension Road', 'item': SITE + '/locations/golf-course-extension-road-gurugram/'},
            {'@type': 'ListItem', 'position': 3, 'name': name, 'item': url}]},
        {'@type': 'ApartmentComplex', '@id': url + '#place', 'name': name, 'url': url, 'image': og,
         'address': {'@type': 'PostalAddress', 'streetAddress': f'Sector {sector}, Golf Course Extension Road', 'addressLocality': 'Gurugram', 'addressRegion': 'Haryana', 'addressCountry': 'IN'}},
        {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in P['faqs']]},
    ]}
    if are:
        inv_block = ('      <div id="are-inventory" data-project="' + E(name) + '"></div>\n'
                     '      <p class="pjb-also">Listings come from agents\' current offers, read and checked by Family&amp;Flats. Price on request: ask us and we get the price. We confirm every property before your visit.</p>\n')
        are_v = are_ads()[1]
        extra_js = f'<script src="/assets/data/anant-raj-ads.js?v={are_v}"></script>\n<script src="/assets/js/ff-are-inventory.js?v={V}"></script>\n'
    else:
        inv_block = f'''      <div class="pjb-none">
        <div><h3>No listings on our website right now</h3><p>{none_text}</p></div>
        <div class="pjb-none-cta"><a class="pjb-btn" href="#enquire" data-ask>Ask for current flats</a><a class="pjb-btn line" href="https://wa.me/{WA}?text={quote(wa_text)}" rel="noopener">WhatsApp us</a></div>
      </div>
'''
        extra_js = ''
    cfg_opts = ''.join(f'<option>{E(b)}</option>' for b in P['bhk'])
    brochure = f'/projects/{slug}/images/{P["brochure"]}' if P.get('brochure') and os.path.exists(os.path.join(ROOT, f'projects/{slug}/images/{P["brochure"]}')) else ''
    return f'''﻿<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{url}">
<link rel="shortcut icon" type="image/x-icon" href="/assets/logo-new-fav.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
<link rel="stylesheet" href="/assets/css/tokens.css?v=phase3-batch8-redesign">
<link rel="stylesheet" href="/assets/css/typography.css?v=phase3-batch8-redesign">
<link rel="stylesheet" href="/assets/css/layout.css?v=phase3-batch8-redesign">
<link rel="stylesheet" href="/assets/css/components.css?v=phase3-batch8-redesign">
<link rel="stylesheet" href="/assets/css/forms.css?v=phase3-batch8-redesign">
<link rel="stylesheet" href="/assets/css/header.css?v=phase3-batch8-redesign-b">
<link rel="stylesheet" href="/assets/css/footer.css?v=footer-final-2">
<link rel="stylesheet" href="/assets/css/responsive.css?v=phase3-batch8-redesign">
<link rel="stylesheet" href="/assets/css/project-detail.css?v=phase3-batch8-redesign-2">
<link rel="stylesheet" href="/assets/css/listings.css?v=phase3-all-projects">
<link rel="stylesheet" href="/assets/css/ff-vv-inventory.css?v=por1">
<link rel="stylesheet" href="/assets/css/ff-vv-listings-b.css?v=2">
<link rel="stylesheet" href="/assets/css/ff-vv-lower-b.css?v=2">
<link rel="stylesheet" href="/assets/css/ff-vv-collage.css?v=1">
<link rel="stylesheet" href="/assets/css/ff-vv-hero-b.css?v=1">
<link rel="stylesheet" href="/assets/css/ff-project-b.css?v={V}">
{VV_STYLES}
{f'<link rel="preload" as="image" href="{big["src"]}" imagesrcset="{big["sm"]} 800w, {big["src"]} {big["w"]}w" imagesizes="(max-width:900px) 100vw, 680px">' if big else ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Family&amp;Flats">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body data-project="{E(slug)}">
<!-- Generated by scripts/generate-project-pages.py from scripts/project-pages.json; do not edit by hand. -->
<div id="header-placeholder"></div>

  <main id="main-content">
  <section class="vvb-hero" aria-labelledby="vvb-title">
    <div class="vvb-inner">
      <div class="vvb-copy">
        <nav class="vvb-crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/locations/golf-course-extension-road-gurugram/">Golf Course Extension Road</a><span aria-hidden="true">/</span><a href="/locations/golf-course-extension-road-gurugram/#sector-{sector.lower()}">Sector {E(sector)}</a><span aria-hidden="true">/</span><span aria-current="page">{E(name)}</span></nav>
        <h1 id="vvb-title">{E(name)}, Sector {E(sector)}</h1>
        <p class="vvb-lead">{E(P['lead'])}</p>
        <ul class="vvb-pills">{pills}</ul>
      </div>
      <div class="vvb-visual">
        {visual}
      </div>
    </div>
    <form class="vvb-search pjb-ask" id="pjb-ask" aria-label="Ask for current flats in {E(name)}">
      <div class="vvb-seg" role="group" aria-label="Buy or rent">
        <button type="button" class="on" data-type="BUY" aria-pressed="true">Buy</button>
        {'' if uc else '<button type="button" data-type="LEASE" aria-pressed="false">Rent</button>'}
      </div>
      <label class="vvb-field" for="pjb-bhk">Home type
        <select id="pjb-bhk"><option value="">Any home</option>{cfg_opts}</select>
      </label>
      <button type="submit" class="vvb-go">Ask for current flats</button>
    </form>
  </section>

  <section id="Ready-to-move" class="section">
    <div class="wrap">
      <div class="vvl-head">
        <h2>Homes available now</h2>
        <p>Flats visited by our team come first, then current listings from agents. Every enquiry comes to Family&amp;Flats.</p>
      </div>
{inv_block}      <p class="pjb-also">Ready to look elsewhere too? <a href="/sale.html">Homes for sale in Gurugram</a> · <a href="/lease.html">Homes for rent in Gurugram</a></p>
    </div>
  </section>

  <section class="vvx-section vvx-about" id="about" aria-labelledby="about-title">
    <div class="vvx-wrap vvx-about-grid">
      <div class="vvx-about-text">
        <h2 id="about-title">About {E(name)}</h2>
        <p>{E(P['about'])}</p>
        <dl class="vvx-facts">
          {''.join(f'<div><dt>{E(k)}</dt><dd>{E(v)}</dd></div>' for k, v in P['facts'])}
        </dl>
      </div>
      <div class="vvx-amenities">
        <h3>{'Amenities' if P['amenities'] else 'How Family&amp;Flats helps'}</h3>
        <ul>
          {''.join(f'<li><i class="fa-solid {E(i)}" aria-hidden="true"></i><div><b>{E(t)}</b><span>{E(d)}</span></div></li>' for i, t, d in (P['amenities'] or HELP))}
        </ul>
      </div>
    </div>
  </section>

  <section class="section pjb-near" id="nearby" aria-labelledby="nearby-title">
    <div class="wrap">
      <h2 id="nearby-title">Nearby on Golf Course Extension Road</h2>
      <p>Communities buyers often compare with {E(name)}.</p>
      <div class="pjb-near-grid">{''.join(f'<a href="{E(u)}">' + (f'<img src="{E(img)}" alt="" width="72" height="72" loading="lazy">' if img else f'<span class="pjb-mono" aria-hidden="true">{E("".join(w[0] for w in n.split()[:2]).upper())}</span>') + f'<span><b>{E(n)}</b><small>Sector {E(sec)} · {E(meta)}</small></span></a>' for sec, u, n, meta, img in near)}</div>
      <p class="pjb-also"><a href="/locations/golf-course-extension-road-gurugram/">All projects on Golf Course Extension Road</a></p>
    </div>
  </section>

<section class="section" id="enquire">
    <div class="wrap">
      <div class="vv-contact-panel">
        <div class="vv-contact-copy">
          <h2>Photos and final price on WhatsApp, before you visit</h2>
          <p>
            Share your requirement and the Family&amp;Flats team will check real options, floor, view, size, price context and visit feasibility. Every enquiry comes to us, so you deal with one team throughout.
          </p>
          <p class="vvx-links">{f'<a href="{brochure}" download>Download brochure (PDF)</a> · ' if brochure else ''}<a href="tel:+919899273673">Call +91 98992 73673</a></p>
          <ol class="vv-steps">
            <li><b>We check the flat</b><span>Availability, price and floor confirmed with the owner or agent, usually the same day.</span></li>
            <li><b>Photos and video on WhatsApp</b><span>See the actual flat before you spend time on a visit.</span></li>
            <li><b>Visit and negotiation</b><span>One Family&amp;Flats advisor arranges the visit and supports you to closing.</span></li>
          </ol>
        </div>

        <form id="vv-enquiry" class="vv-form-card" data-ff-enquiry="off" data-project="{E(name)}" novalidate>
          <h3 class="vv-form-title">Tell us what you are looking for</h3>
          <p class="vv-form-sub">Your requirement reaches the Family&amp;Flats team for follow-up.</p>
          <div class="vv-ref" id="vv-ref" hidden>
            <span>Enquiring about <b id="vv-ref-id"></b><span id="vv-ref-kind"></span></span>
            <button type="button" id="vv-ref-remove">Remove</button>
          </div>
          <div class="vv-form-grid">
            <div><label for="vv-name">Name *</label><input id="vv-name" name="name" type="text" autocomplete="name"></div>
            <div><label for="vv-phone">Mobile *</label><input id="vv-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel"></div>
            <div><label for="vv-looking">Looking to</label><select id="vv-looking" name="transactionType"><option value="BUY">Buy</option>{'' if uc else '<option value="LEASE">Rent</option>'}</select></div>
            <div><label for="vv-config">Configuration</label><select id="vv-config" name="configuration"><option value="">Any configuration</option>{cfg_opts}</select></div>
            <div class="vv-full"><label for="vv-note">Anything specific?</label><textarea id="vv-note" name="message" rows="3" placeholder="Floor, furnishing, view, visit timing"></textarea></div>
            <label class="vv-full vv-consent"><input type="checkbox" id="vv-consent" name="consent"> I agree to be contacted by Family&amp;Flats about my requirement.</label>
            <input class="vv-hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true" aria-label="Company">
            <p class="vv-full vv-err" id="vv-err" role="alert"></p>
            <button type="submit" class="vv-full" id="vv-send">Send requirement</button>
          </div>
        </form>
      </div>
    </div>
  </section>

  <section class="section white vvx-faq" id="faq">
    <div class="wrap">
      <div class="vvx-head">
        <h2>Questions buyers ask</h2>
      </div>
      <div class="vv-faq">
{''.join(f"""        <article>
          <h3>{E(q)}</h3>
          <p>{E(a)}</p>
        </article>
""" for q, a in P['faqs'])}      </div>
    </div>
  </section>

  <section class="vvx-rera" aria-label="Agent registration">
    <div class="vvx-wrap"><p><b>Family&amp;Flats</b> · HARERA Gurugram registered real estate agent · RC/HARERA/GGM/1766/1361/2022/134 · <a href="/projects/ireovictoryvalley/images/Agent-rera.jpeg" target="_blank" rel="noopener">View certificate</a> · Not the developer's official website.</p></div>
  </section>
  </main>

<div id="footer-placeholder"></div>
<script>window.FF_GALLERY = {json.dumps(gallery, ensure_ascii=False)};</script>
<script src="/assets/js/main.js?v=phase3-batch8-redesign"></script>
<script src="/assets/js/ff-vv-enquiry.js?v={V}"></script>
<script src="/assets/js/ff-vv-gallery.js?v={V}"></script>
<script src="/assets/js/ff-vv-faq.js?v=1"></script>
{extra_js}<script src="/assets/js/ff-project-b.js?v={V}"></script>
</body>
</html>
'''


def keep_shell(new, old):
    for k in ('header', 'footer'):
        m = re.search(r'<div id="%s-placeholder"[^>]*>.*?</div><!--/ff-%s-->' % (k, k), old, re.S)
        if m:
            new = new.replace(f'<div id="{k}-placeholder"></div>', m.group(0), 1)
    return new


road = road_projects()
stale = 0
for slug, P in data.items():
    if only and slug not in only:
        continue
    target = os.path.join(OUT or ROOT, 'projects', slug, 'index.html')
    live = os.path.join(ROOT, 'projects', slug, 'index.html')
    old = open(live, encoding='utf-8', newline='').read() if os.path.exists(live) else ''
    new = page(slug, P, road)
    if 'Generated by scripts/generate-project-pages.py' in old:
        new = keep_shell(new, old)
    new = new.replace('\r\n', '\n').replace('\n', '\r\n')
    if CHECK:
        if new != old:
            stale += 1; print('STALE', slug)
        continue
    os.makedirs(os.path.dirname(target), exist_ok=True)
    if not OUT and os.path.exists(live) and 'Generated by scripts/generate-project-pages.py' not in old:
        bk = os.path.join(ROOT, 'projects', slug, '_backup_before_design_b', 'index.html')  # _backup* is never deployed
        os.makedirs(os.path.dirname(bk), exist_ok=True)
        if not os.path.exists(bk):
            open(bk, 'w', encoding='utf-8', newline='').write(old)
    open(target, 'w', encoding='utf-8', newline='').write(new)
    print('WROTE', os.path.relpath(target, OUT or ROOT))
print(f'PROJECT_PAGES_{"CHECK" if CHECK else "DONE"} stale={stale}')
if CHECK and stale:
    sys.exit(1)
