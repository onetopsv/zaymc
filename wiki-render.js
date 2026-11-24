/*
 * wiki-render.js — biến wiki.json thành HTML.
 * Dùng chung cho trang chính (index.html) và trang quản trị (admin/) để bản xem trước giống hệt thật.
 *
 * Cú pháp chữ trong ô nhập:
 *   **đậm**   `lệnh`   {#ffd166}chữ màu{/}   [chữ hiện](https://link)   [chữ hiện](tab:ma-tab:ma-neo)
 *   xuống dòng = xuống dòng
 */
(function (root) {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function link(_, text, url) {
    var m = /^tab:([a-z0-9-]+)(?::([A-Za-z0-9_-]+))?$/.exec(url);
    if (m) {
      return '<a href="#wiki" data-tab="' + m[1] + '"' + (m[2] ? ' data-anchor="' + m[2] + '"' : '') +
        ' style="color:var(--a)">' + text + '</a>';
    }
    if (/^(https?:\/\/|#|\/)/.test(url)) {
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" style="color:var(--a)">' + text + '</a>';
    }
    return text;
  }

  function inline(s) {
    var h = esc(s);
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\{(#[0-9a-fA-F]{3,6})\}([\s\S]*?)\{\/\}/g, '<strong style="color:$1">$2</strong>');
    h = h.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, link);
    return h.replace(/\n/g, '<br>');
  }

  function safeId(s) { return /^[A-Za-z0-9_-]+$/.test(s || '') ? s : ''; }

  function block(b) {
    switch (b.t) {
      case 'h':
        return '<h3' + (safeId(b.id) ? ' id="' + b.id + '"' : '') + '>' + inline(b.text) + '</h3>';
      case 'p':
        return '<p>' + inline(b.text) + '</p>';
      case 'ul':
        return '<ul>' + (b.items || []).map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</ul>';
      case 'note':
        return '<div class="hl"><p>' + inline(b.text) + '</p></div>';
      case 'warn':
        return '<div class="warn"><p>' + inline(b.text) + '</p></div>';
      case 'table':
        return '<div class="wtable-wrap"><table class="wtable"><thead><tr>' +
          (b.head || []).map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') +
          '</tr></thead><tbody>' +
          (b.rows || []).map(function (r) {
            return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>';
      case 'cards':
        return '<div class="wgrid">' + (b.cards || []).map(function (c) {
          var tone = /^(pham|dia|thien)$/.test(c.tone || '') ? ' class="t-' + c.tone + '"' : '';
          return '<div class="wcard"><h5' + tone + '>' + inline(c.title) + '</h5><p>' + inline(c.text) + '</p></div>';
        }).join('') + '</div>';
      case 'realm':
        return '<div class="rplane">' + esc(b.title) + (b.sub ? ' <small>' + esc(b.sub) + '</small>' : '') + '</div>' +
          ((b.items || []).length ? '<ol class="rlist">' + b.items.map(function (i) {
            return '<li' + (i.note ? ' class="gate"' : '') + '><b>' + esc(i.name) + '</b>' +
              (i.note ? '<em>' + esc(i.note) + '</em>' : '') + '</li>';
          }).join('') + '</ol>' : '');
      case 'html':
        return b.html || '';
      default:
        return '';
    }
  }

  function panel(tab, active) {
    return '<div class="wpanel' + (active ? ' active' : '') + '" id="panel-' + tab.id + '"><div class="wc">' +
      (tab.blocks || []).map(block).join('') + '</div></div>';
  }

  function tabs(list, activeId) {
    return list.map(function (t) {
      return '<button type="button" class="wtab' + (t.id === activeId ? ' active' : '') + '" data-tab="' + t.id + '">' +
        esc(t.icon) + ' ' + esc(t.label) + '</button>';
    }).join('');
  }

  function cards(list) {
    return list.filter(function (t) { return t.card && t.card.title; }).map(function (t) {
      return '<a href="#wiki" class="fc" data-tab="' + t.id + '"><div class="fi">' + esc(t.card.icon || t.icon) +
        '</div><h3>' + esc(t.card.title) + '</h3><p>' + esc(t.card.desc) + '</p></a>';
    }).join('');
  }

  var api = { esc: esc, inline: inline, block: block, panel: panel, tabs: tabs, cards: cards };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WikiRender = api;
})(typeof window !== 'undefined' ? window : this);
