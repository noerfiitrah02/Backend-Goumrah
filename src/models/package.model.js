module.exports = (sequelize, DataTypes) => {
  const Package = sequelize.define(
    "Package",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      category_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      price_double: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      price_tripple: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      price_quadraple: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      quota: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      remaining_quota: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      departure_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      return_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      departure_city: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      featured_image: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM("draft", "published", "archived"),
        defaultValue: "draft",
      },
      includes: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      excludes: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      terms_conditions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  Package.associate = (models) => {
    Package.belongsTo(models.PackageCategory, {
      foreignKey: "category_id",
      as: "category",
    });

    Package.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });

    Package.belongsTo(models.TravelAgent, {
      foreignKey: "created_by",
      as: "travel",
    });

    Package.hasMany(models.PackageImage, {
      foreignKey: "package_id",
      as: "images",
    });

    Package.hasMany(models.PackageFlight, {
      foreignKey: "package_id",
      as: "flights",
    });

    Package.hasMany(models.PackageHotel, {
      foreignKey: "package_id",
      as: "hotels",
    });

    Package.hasMany(models.PackageItinerary, {
      foreignKey: "package_id",
      as: "itineraries",
    });

    Package.hasMany(models.Order, {
      foreignKey: "package_id",
      as: "orders",
    });
  };

  return Package;
};
