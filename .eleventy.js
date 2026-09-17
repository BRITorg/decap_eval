module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("data");
  eleventyConfig.addPassthroughCopy({ design_system_assets: "assets" });

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
