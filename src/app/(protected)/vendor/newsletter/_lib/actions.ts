export const subscribe = async (data: {
  title: string;
  sub_title: string;
  email: string;
  sendEmailToAll: boolean;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const isSuccess = Math.random() > 0.5; // 50% chance of success or error
      if (isSuccess) {
        console.log("Subscription successful:", data);
        resolve();
      } else {
        console.error("Subscription failed");
        reject(new Error("Failed to subscribe. Please try again."));
      }
    }, 1000);
  });
};
