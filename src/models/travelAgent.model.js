module.exports = (sequelize, DataTypes) => {
  const TravelAgent = sequelize.define(
    "TravelAgent",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      logo: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      travel_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      company_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      sk_number: {
        type: DataTypes.STRING(100),
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
      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
    },
    {
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  TravelAgent.associate = (models) => {
    TravelAgent.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return TravelAgent;
};
