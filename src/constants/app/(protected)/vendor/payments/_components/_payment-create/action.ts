import { PaymentType } from "./schema";
export const createPayment = async (payment: PaymentType) => {
  try {
    new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });
    return {
      status: true,
      message: "Payment created successfully.",
      payment: payment,
    };
  } catch (error) {
    return {
      status: false,
      message: "Can not create the payment.",
      payment: payment,
    };
  }
};
