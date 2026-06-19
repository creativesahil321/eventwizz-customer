import { PaymentType } from "./schema";

export const updatePayment = async (payment: PaymentType) => {
  try {
    new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });
    return {
      status: true,
      message: "Payment updated successfully.",
      payment: payment,
    };
  } catch (error: unknown) {
    console.error(error);
    return {
      status: false,
      message: "Can not update the payment.",
      payment: payment,
    };
  }
};
