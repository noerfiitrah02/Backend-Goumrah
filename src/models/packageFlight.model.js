module.exports = (sequelize, DataTypes) => {
  const PackageFlight = sequelize.define(
    "PackageFlight",
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
      airline_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      flight_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      departure_airport: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      departure_datetime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      arrival_airport: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      arrival_datetime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      flight_type: {
        type: DataTypes.ENUM("departure", "return"),
        allowNull: false,
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  PackageFlight.associate = (models) => {
    PackageFlight.belongsTo(models.Package, {
      foreignKey: "package_id",
      as: "package",
    });

    PackageFlight.belongsTo(models.Airline, {
      foreignKey: "airline_id",
      as: "airline",
    });
  };

  return PackageFlight;
};
