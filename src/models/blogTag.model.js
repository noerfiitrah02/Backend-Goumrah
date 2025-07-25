module.exports = (sequelize, DataTypes) => {
  const BlogTag = sequelize.define(
    "BlogTag",
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: {
            msg: "Nama tag tidak boleh kosong",
          },
          len: {
            args: [2, 50],
            msg: "Panjang nama tag harus antara 2-50 karakter",
          },
        },
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          is: {
            args: /^[a-z0-9-]+$/,
            msg: "Slug hanya boleh mengandung huruf kecil, angka, dan dash",
          },
        },
      },
    },
    {
      timestamps: false,
      tableName: "blogtags",
    }
  );

  BlogTag.associate = (models) => {
    BlogTag.belongsToMany(models.BlogPost, {
      through: models.BlogPostTag,
      foreignKey: "tag_id",
      as: "posts",
    });
  };

  return BlogTag;
};
