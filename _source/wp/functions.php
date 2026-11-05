<?php
/**
 * Save Life Talent theme functions.
 */
if (!defined('ABSPATH')) exit;

require_once get_template_directory() . '/inc-config.php';

/* ---------- Setup ---------- */
add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('html5', array('search-form', 'gallery', 'caption', 'style', 'script'));
    add_theme_support('post-thumbnails');
});

add_action('wp_enqueue_scripts', function () {
    $v = wp_get_theme()->get('Version');
    $uri = get_template_directory_uri();
    wp_enqueue_style('slt-site', $uri . '/assets/css/site.css', array(), $v);
    wp_enqueue_script('slt-site', $uri . '/assets/js/site.js', array(), $v, true);
});

add_action('wp_head', function () {
    echo '<link rel="icon" href="' . esc_url(get_template_directory_uri() . '/assets/img/favicon.svg') . '" type="image/svg+xml">' . "\n";
}, 2);

/* ---------- Per-page meta (title + description) ---------- */
$GLOBALS['slt_meta'] = array();
function slt_set_meta($m) { $GLOBALS['slt_meta'] = $m; }
function slt_meta($k) { return isset($GLOBALS['slt_meta'][$k]) ? $GLOBALS['slt_meta'][$k] : ''; }
// Theme sets titles unless an SEO plugin (Yoast, Rank Math) is active.
add_filter('pre_get_document_title', function ($t) {
    if (defined('WPSEO_VERSION') || class_exists('RankMath')) return $t;
    $own = slt_meta('title');
    return $own ? $own : $t;
}, 20);

/* ---------- Site options (Appearance > Customize) ---------- */
function slt_opt($key) {
    $d = slt_defaults();
    $v = get_theme_mod('slt_' . $key, '');
    return $v !== '' ? $v : (isset($d[$key]) ? $d[$key] : '');
}
function slt_tel() {
    $digits = preg_replace('/\D/', '', slt_opt('phone'));
    if (strlen($digits) === 10) return '+1' . $digits;
    return $digits ? '+' . $digits : '';
}
add_action('customize_register', function ($wp) {
    $wp->add_section('slt_contact', array('title' => 'Save Life Talent', 'priority' => 30,
        'description' => 'Contact details shown across the site, plus the inbox that receives form submissions.'));
    $fields = array(
        'phone' => '24/7 staffing desk phone',
        'email' => 'Public email',
        'form_email' => 'Form submissions go to (email)',
        'address' => 'Office address',
        'city' => 'Default job location (City, ST)',
        'hours' => 'Office hours',
    );
    $d = slt_defaults();
    foreach ($fields as $k => $label) {
        $wp->add_setting('slt_' . $k, array('default' => $d[$k], 'sanitize_callback' => 'sanitize_text_field'));
        $wp->add_control('slt_' . $k, array('label' => $label, 'section' => 'slt_contact', 'type' => 'text'));
    }
});

/* ---------- Links between theme pages ---------- */
function slt_link($key) {
    if ($key === 'home') return home_url('/');
    $pages = slt_pages();
    if (!isset($pages[$key])) return home_url('/');
    $p = get_page_by_path($pages[$key]['slug']);
    return $p ? get_permalink($p) : home_url('/' . $pages[$key]['slug'] . '/');
}

/* ---------- Create pages + set homepage on activation ---------- */
function slt_install_pages() {
    $home_id = 0;
    foreach (slt_pages() as $key => $p) {
        $existing = get_page_by_path($p['slug']);
        $id = $existing ? $existing->ID : wp_insert_post(array(
            'post_title'   => $p['title'],
            'post_name'    => $p['slug'],
            'post_status'  => 'publish',
            'post_type'    => 'page',
            'post_content' => '<!-- wp:paragraph --><p>This page is rendered by the Save Life Talent theme (page-' . esc_html($p['slug']) . '.php).</p><!-- /wp:paragraph -->',
        ));
        if ($key === 'home') $home_id = $id;
    }
    if ($home_id) {
        update_option('show_on_front', 'page');
        update_option('page_on_front', $home_id);
    }
    if (get_option('permalink_structure') === '') {
        update_option('permalink_structure', '/%postname%/');
    }
    flush_rewrite_rules();
}
add_action('after_switch_theme', 'slt_install_pages');

/* Admin notice explaining where content lives */
add_action('admin_notices', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->base !== 'themes') return;
    echo '<div class="notice notice-info"><p><strong>Save Life Talent theme:</strong> pages were created and the homepage set. Update phone, email and address under <a href="' . esc_url(admin_url('customize.php?autofocus[section]=slt_contact')) . '">Appearance &rarr; Customize &rarr; Save Life Talent</a>.</p></div>';
});
