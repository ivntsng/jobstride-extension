window.Utils = {
  convertHtmlToMarkdown: function (html) {
    // Your HTML to markdown conversion logic here
    return html.replace(/<[^>]*>/g, "").trim();
  },

  convertHtmlToText: function (html) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    ["script", "style", "svg"].forEach((tag) => {
      tempDiv.querySelectorAll(tag).forEach((el) => el.remove());
    });

    const blockElements = [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "div",
      "section",
    ];
    blockElements.forEach((tag) => {
      tempDiv.querySelectorAll(tag).forEach((el) => {
        el.insertAdjacentText("beforebegin", "\n\n");
        el.insertAdjacentText("afterend", "\n\n");
      });
    });

    tempDiv.querySelectorAll("ul, ol").forEach((list) => {
      list.insertAdjacentText("beforebegin", "\n");
      const isOrdered = list.tagName.toLowerCase() === "ol";
      let counter = 1;

      list.querySelectorAll("li").forEach((li) => {
        const prefix = isOrdered ? `${counter}. ` : "• ";
        li.insertAdjacentText("afterbegin", `${prefix}`);
        li.insertAdjacentText("afterend", "\n");
        if (isOrdered) counter++;
      });
      list.insertAdjacentText("afterend", "\n");
    });

    tempDiv.querySelectorAll("br").forEach((br) => {
      br.insertAdjacentText("beforebegin", "\n");
    });

    // Extract and clean text
    let text = tempDiv.textContent
      .replace(/\t+/g, " ")
      .replace(/\r?\n/g, "\n")
      .replace(/[ ]{2,}/g, " ")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n");
    return text;
  },
};
