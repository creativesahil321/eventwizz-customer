import { promisify } from "util";
import { EmailLog } from "../../_lib/types";

const delay = promisify(setTimeout);

export const deleteEmailLog = async (email: EmailLog | null) => {
  if (!email) {
    return {
      status: false,
      error: "No email provided",
      message: "Failed to delete email",
    };
  }

  await delay(1500);
  return {
    status: true,
    error: null,
    message: "Email deleted successfully.",
  };
};
