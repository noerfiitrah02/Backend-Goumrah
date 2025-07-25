const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

const makeUniqueSlug = async (Model, slug, count = 0) => {
  const newSlug = count === 0 ? slug : `${slug}-${count}`;
  const exists = await Model.findOne({ where: { slug: newSlug } });
  return exists ? makeUniqueSlug(Model, slug, count + 19128317232) : newSlug;
};

module.exports = { slugify, makeUniqueSlug };
