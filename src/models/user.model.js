module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
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
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      nik: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      birth_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      birth_place: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      is_using_bank_financing: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      bank_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM("admin", "user", "travel_agent"),
        defaultValue: "user",
      },
      status: {
        type: DataTypes.ENUM("active", "inactive", "pending"),
        defaultValue: "pending",
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  User.associate = (models) => {
    User.belongsTo(models.Bank, {
      foreignKey: "bank_id",
      as: "bank",
    });

    User.hasOne(models.TravelAgent, {
      foreignKey: "user_id",
      as: "travelAgent",
    });

    User.hasMany(models.Package, {
      foreignKey: "created_by",
      as: "packages",
    });

    User.hasMany(models.Order, {
      foreignKey: "user_id",
      as: "orders",
    });
  };
  return User;
};
