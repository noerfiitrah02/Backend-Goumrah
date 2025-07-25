module.exports = (sequelize, DataTypes) => {
  const Bank = sequelize.define(
    "Bank",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      bank_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      logo: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  Bank.associate = (models) => {
    Bank.hasMany(models.User, {
      foreignKey: "bank_id",
      as: "users",
    });
  };

  return Bank;
};
