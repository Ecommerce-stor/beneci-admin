"use strict";

const Razorpay = require("razorpay");
const axios = require("axios"); // Import axios for making HTTP requests
const { createCoreController } = require("@strapi/strapi").factories;

const instance = new Razorpay({
  key_id: process.env.RAZOR_ID,
  key_secret: process.env.RAZOR_SECRET,
});

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products, shiprocketToken, shiprocketOrderPayload } =
      ctx.request.body;

    try {
      // If products are present, create a Razorpay order
      if (products) {
        function sumPrices(products) {
          return products.reduce(
            (sum, product) =>
              sum + (product.attributes?.price || 0) * (product.quantity || 1),
            0
          );
        }

        // Create the order with Razorpay
        const order = await instance.orders.create({
          amount: sumPrices(products) * 100, // Convert to the smallest currency unit
          currency: "INR",
          receipt: "receipt#1",
          notes: {
            key1: "value3",
            key2: "value2",
          },
        });

        // Save the order in your Strapi database
        await strapi.service("api::order.order").create({
          data: { products, stripeId: order.id },
        });

        // Return the Razorpay order details
        return {
          stripeSession: order,
        };
      } else if (shiprocketToken && shiprocketOrderPayload) {
        // Create the order in Shiprocket
        const shiprocketResponse = await axios.post(
          "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
          shiprocketOrderPayload,
          {
            headers: {
              Authorization: `Bearer ${shiprocketToken?.token}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Handle the response from Shiprocket
        if (shiprocketResponse.status !== 200) {
          throw new Error("Failed to create Shiprocket order");
        }

        // Return the Shiprocket order details
        return {
          shiprocketOrder: shiprocketResponse.data,
        };
      } else {
        throw new Error("Invalid input data.");
      }
    } catch (error) {
      ctx.response.status = 500;
      return { error: error.message || "An error occurred" };
    }
  },
}));
