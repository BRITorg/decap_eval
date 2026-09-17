module.exports = {
  layout: "base.njk",
  eleventyComputed: {
    permalink: (data) => `/${data.page.fileSlug}/`,
  },
};
