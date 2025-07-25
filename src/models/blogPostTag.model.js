// blogPostTag.model.js
module.exports = (sequelize, DataTypes) => {
  const BlogPostTag = sequelize.define(
    "BlogPostTag",
    {
      post_id: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      tag_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
    },
    {
      timestamps: false,
      tableName: "blogposttags",
    }
  );

  return BlogPostTag;
};
