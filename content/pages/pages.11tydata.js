module.exports = {
  layout: "base.njk",
  eleventyComputed: {
    // Home's URL is "/", not "/home/" -- computed here rather than in the
    // file's own front matter, since Decap's schema for this collection
    // doesn't include a permalink field and would drop it on save.
    permalink: (data) => (data.page.fileSlug === "home" ? "/" : `/${data.page.fileSlug}/`),
  },
};
