module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("data");

  return {
    pathPrefix: "/decap_eval/",
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
  };
};
