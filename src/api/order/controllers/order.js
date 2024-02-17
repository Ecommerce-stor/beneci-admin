"use strict";

const Razorpay = require("razorpay");
const { createCoreController } = require("@strapi/strapi").factories;

const instance = new Razorpay({
  key_id: process.env.RAZOR_ID,
  key_secret: process.env.RAZOR_SECRET,
});



module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products } = ctx.request.body;
    try {
      function sumPrices(products) {
        return products.reduce((sum, product) => sum + (product.attributes?.price || 0) * (product.quantity || 1), 0);
      }
      
      const order = await instance.orders.create({
        amount: sumPrices(products)*100, // Replace with the actual amount
        currency: "INR",
        receipt: "receipt#1",
        notes: {
          key1: "value3",
          key2: "value2",
        },
      });

      await strapi
        .service("api::order.order")
        .create({ data: { products, stripeId: order.id } });

      // Redirect the user to the Razorpay checkout page
      return { stripeSession: order };
    } catch (error) {
      ctx.response.status  = 500;
      return { error };
    }
  },
}));
