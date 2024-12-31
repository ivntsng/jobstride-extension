window.Utils = {
  convertHtmlToMarkdown: function (html) {
    // Your HTML to markdown conversion logic here
    return html.replace(/<[^>]*>/g, "").trim();
  },
};
