module.exports = (sequelize, DataTypes) => {
  const BlogCategory = sequelize.define(
    "BlogCategory",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  BlogCategory.associate = (models) => {
    BlogCategory.hasMany(models.BlogPost, {
      foreignKey: "category_id",
      as: "posts",
    });
  };

  return BlogCategory;
};
