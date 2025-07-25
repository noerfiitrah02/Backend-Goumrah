module.exports = (sequelize, DataTypes) => {
  const PackageItinerary = sequelize.define(
    "PackageItinerary",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      package_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      day: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      indexes: [
        {
          unique: true,
          fields: ["package_id", "day"],
        },
      ],
    }
  );

  PackageItinerary.associate = (models) => {
    PackageItinerary.belongsTo(models.Package, {
      foreignKey: "package_id",
      as: "package",
    });
  };

  return PackageItinerary;
};
