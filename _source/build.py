#!/usr/bin/env python3
"""Build the Save Life Talent site two ways from one source.

    python3 build.py            -> ./dist/static   (Git / GitHub Pages / Netlify ready)
                                   ./dist/wordpress/savelifetalent (WordPress theme)

Edit site.config.json for phone, email, address, etc., then re-run.
"""
import json, re, shutil, datetime, os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CFG = json.loads((ROOT / "site.config.json").read_text())
DIST = ROOT / "dist"
YEAR = str(datetime.date.today().year)

# key -> (slug / file stem, nav label used as WP page title)
PAGES = {
    "home":       ("index",       "Home"),
    "facilities": ("facilities",  "For Facilities"),
    "clinicians": ("clinicians",  "For Clinicians"),
    "jobs":       ("jobs",        "Jobs"),
    "ai":         ("how-our-ai-works", "How Our AI Works"),
    "contact":    ("contact",     "Contact"),
    "thank-you":  ("thank-you",   "Thank You"),
    "privacy":    ("privacy",     "Privacy & Terms"),
}

def tel(phone):
    d = re.sub(r"\D", "", phone)
    return "+1" + d if len(d) == 10 else ("+" + d if d else "")

def read_page(key):
    raw = (ROOT / "pages" / f"{key}.html").read_text()
    m = re.match(r"<!--meta (.*?)-->\n", raw, re.S)
    meta = dict(re.findall(r'(\w+)="(.*?)"', m.group(1)))
    return meta, raw[m.end():]

# ---------------- static ----------------
def static_url(key, absolute=False):
    stem = PAGES[key][0]
    path = "" if stem == "index" else f"{stem}.html"
    return (CFG["site_url"].rstrip("/") + "/" + path) if absolute else (path or "index.html")

def render_static(text, key, meta):
    vals = {
        "phone": CFG["phone"], "phone_tel": tel(CFG["phone"]), "email": CFG["email"],
        "form_email": CFG["form_email"], "address": CFG["address"], "city": CFG["city"],
        "hours": CFG["hours"], "year": YEAR, "page": key, "body_class": "",
        "head_assets": '<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">\n<link rel="stylesheet" href="assets/css/site.css">',
        "foot_assets": '<script src="assets/js/site.js" defer></script>',
    }
    canon = static_url(key, True) if key in PAGES else CFG["site_url"]
    robots = '<meta name="robots" content="noindex">\n' if meta.get("noindex") else ""
    vals["head"] = (f'<title>{meta["title"]}</title>\n<meta name="description" content="{meta["description"]}">\n'
                    f'{robots}<link rel="canonical" href="{canon}">\n'
                    f'<meta property="og:title" content="{meta["title"]}">\n<meta property="og:description" content="{meta["description"]}">\n'
                    f'<meta property="og:type" content="website">\n<meta property="og:url" content="{canon}">')
    text = re.sub(r"\{\{link:([\w-]+)\}\}", lambda m: static_url(m.group(1)), text)
    text = re.sub(r"\{\{abs:([\w-]+)\}\}", lambda m: static_url(m.group(1), True), text)
    text = re.sub(r"\{\{asset:([^}]+)\}\}", lambda m: "assets/" + m.group(1), text)
    text = re.sub(r"\{\{(\w+)\}\}", lambda m: vals[m.group(1)], text)
    return text

def build_static():
    out = DIST / "static"
    shutil.rmtree(out, ignore_errors=True); out.mkdir(parents=True)
    shutil.copytree(ROOT / "assets", out / "assets")
    head, foot = (ROOT / "partials/header.html").read_text(), (ROOT / "partials/footer.html").read_text()
    urls = []
    for key, (stem, _) in PAGES.items():
        meta, body = read_page(key)
        (out / f"{stem}.html").write_text(render_static(head + body + foot, key, meta))
        if not meta.get("noindex"): urls.append(static_url(key, True))
    # 404 page
    meta = {"title": "Page not found | Save Life Talent", "description": "Page not found.", "noindex": "1"}
    body = ('<section class="page-hero" style="padding:110px 0 120px"><div class="wrap"><h1>This page has moved or no longer exists.</h1>'
            '<p class="lede">Try the job search, or head back to the homepage.</p><div class="btn-row" style="margin-top:28px">'
            '<a class="btn btn-primary" href="/">Back to home</a><a class="btn btn-ghost" href="/jobs.html">Search jobs</a></div></div></section>')
    page404 = render_static(head + body + foot, "404", meta)
    page404 = page404.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/">', 1)
    (out / "404.html").write_text(page404)
    (out / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {CFG['site_url'].rstrip('/')}/sitemap.xml\n")
    sm = "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls)
    (out / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{sm}</urlset>\n')
    domain = re.sub(r"^https?://", "", CFG["site_url"]).strip("/")
    (out / "CNAME").write_text(domain + "\n")
    (out / ".nojekyll").write_text("")
    return out

# ---------------- WordPress ----------------
def php(expr): return f"<?php echo {expr}; ?>"

def render_wp(text):
    text = re.sub(r"\{\{link:([\w-]+)\}\}", lambda m: php(f"esc_url(slt_link('{m.group(1)}'))"), text)
    text = re.sub(r"\{\{abs:([\w-]+)\}\}", lambda m: php(f"esc_url(slt_link('{m.group(1)}'))"), text)
    text = re.sub(r"\{\{asset:([^}]+)\}\}", lambda m: php(f"esc_url(get_template_directory_uri() . '/assets/{m.group(1)}')"), text)
    vals = {
        "phone": php("esc_html(slt_opt('phone'))"), "phone_tel": php("esc_attr(slt_tel())"),
        "email": php("esc_html(slt_opt('email'))"), "form_email": php("esc_attr(slt_opt('form_email'))"),
        "address": php("esc_html(slt_opt('address'))"), "city": php("esc_html(slt_opt('city'))"),
        "hours": php("esc_html(slt_opt('hours'))"), "year": php("esc_html(date('Y'))"),
        "page": php("esc_attr(slt_meta('page'))"), "body_class": "<?php body_class(); ?>",
        "head": '<meta name="description" content="' + php("esc_attr(slt_meta('description'))") + '">\n<?php if (slt_meta(\'noindex\')) echo \'<meta name="robots" content="noindex">\'; ?>',
        "head_assets": "<?php wp_head(); ?>",
        "foot_assets": "<?php wp_footer(); ?>",
    }
    return re.sub(r"\{\{(\w+)\}\}", lambda m: vals[m.group(1)], text)

def php_str(s): return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"

def build_wp():
    theme = DIST / "wordpress" / "savelifetalent"
    shutil.rmtree(DIST / "wordpress", ignore_errors=True); theme.mkdir(parents=True)
    shutil.copytree(ROOT / "assets", theme / "assets")
    head = render_wp((ROOT / "partials/header.html").read_text()).replace("<body ", "<body ", 1)
    head = head.replace('<a class="skip"', "<?php wp_body_open(); ?>\n<a class=\"skip\"", 1)
    (theme / "header.php").write_text(head)
    (theme / "footer.php").write_text(render_wp((ROOT / "partials/footer.html").read_text()))
    for key, (stem, title) in PAGES.items():
        meta, body = read_page(key)
        setmeta = (f"<?php\n/* Template for the \"{title}\" page. Content is edited in this file (or in /pages/{key}.html of the source repo). */\n"
                   f"slt_set_meta(array('page' => '{key}', 'title' => {php_str(meta['title'])}, 'description' => {php_str(meta['description'])}, 'noindex' => {'true' if meta.get('noindex') else 'false'}));\n"
                   "get_header(); ?>\n")
        fname = "front-page.php" if key == "home" else f"page-{stem}.php"
        (theme / fname).write_text(setmeta + render_wp(body) + "\n<?php get_footer();\n")
    generic = ("<?php get_header(); ?>\n<section class=\"page-hero\"><div class=\"wrap\"><h1><?php echo is_singular() ? esc_html(get_the_title()) : esc_html(wp_strip_all_tags(get_the_archive_title() ?: get_bloginfo('name'))); ?></h1></div></section>\n"
               "<section><div class=\"wrap prose\">\n<?php if (have_posts()) : while (have_posts()) : the_post(); ?>\n"
               "<?php if (!is_singular()) : ?><h2><a href=\"<?php the_permalink(); ?>\"><?php the_title(); ?></a></h2><?php the_excerpt(); ?>\n<?php else : the_content(); endif; ?>\n"
               "<?php endwhile; the_posts_pagination(); else : ?><p>Nothing here yet.</p><?php endif; ?>\n</div></section>\n<?php get_footer();\n")
    for f in ("index.php", "page.php", "single.php"):
        (theme / f).write_text(generic)
    (theme / "404.php").write_text("<?php slt_set_meta(array('page'=>'404','title'=>'Page not found | Save Life Talent','description'=>'Page not found.','noindex'=>true)); status_header(404); get_header(); ?>\n"
        "<section class=\"page-hero\" style=\"padding:110px 0 120px\"><div class=\"wrap\"><h1>This page has moved or no longer exists.</h1><p class=\"lede\">Try the job search, or head back to the homepage.</p>"
        "<div class=\"btn-row\" style=\"margin-top:28px\"><a class=\"btn btn-primary\" href=\"<?php echo esc_url(home_url('/')); ?>\">Back to home</a><a class=\"btn btn-ghost\" href=\"<?php echo esc_url(slt_link('jobs')); ?>\">Search jobs</a></div></div></section>\n<?php get_footer();\n")
    shutil.copy(ROOT / "wp" / "functions.php", theme / "functions.php")
    shutil.copy(ROOT / "wp" / "style.css", theme / "style.css")
    if (ROOT / "wp" / "screenshot.png").exists(): shutil.copy(ROOT / "wp" / "screenshot.png", theme / "screenshot.png")
    # page map + defaults for functions.php
    pages_php = ",\n".join(f"    '{k}' => array('slug' => '{('home' if v[0]=='index' else v[0])}', 'title' => {php_str(v[1])})" for k, v in PAGES.items())
    defaults_php = ",\n".join(f"    '{k}' => {php_str(CFG[k])}" for k in ("phone", "email", "form_email", "address", "city", "hours"))
    (theme / "inc-config.php").write_text(f"<?php\n// Generated by build.py\nfunction slt_pages() {{ return array(\n{pages_php}\n); }}\nfunction slt_defaults() {{ return array(\n{defaults_php}\n); }}\n")
    return theme

if __name__ == "__main__":
    s = build_static(); w = build_wp()
    print("static ->", s); print("wordpress ->", w)
