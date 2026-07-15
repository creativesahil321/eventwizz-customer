import { api } from "../../core/api-client";
import { API_ENDPOINTS } from "../../core/endpoints";
import {
  CartRequest,
  CartResponse,
  DeleteCartDateRequest,
  GetCartResponse,
} from "./type";

export const cartService = {
  /**
   * Store event booking data in the database
   * This includes event details, selected date, drink packages, tables, and tickets
   */
  storeEventBooking: async (data: CartRequest): Promise<CartResponse> => {
    return api.post<CartResponse>(
      API_ENDPOINTS.CUSTOMER.BOOK_EVENT.STORE_CART_DATA,
      data,
      { returnFullResponse: true }
    );
  },

  /**
   * Get all cart data for the current user
   * Returns all events, dates, and items in the user's cart
   */
  getCartData: async (): Promise<GetCartResponse> => {
    return api.get<GetCartResponse>(
      API_ENDPOINTS.CUSTOMER.BOOK_EVENT.GET_CART_DATA
    );
  },
  deleteCartData: async (
    params: DeleteCartDateRequest | "all",
  ): Promise<void> => {
    if (params === "all") {
      return api.delete<void>(
        API_ENDPOINTS.CUSTOMER.BOOK_EVENT.DELETE_ALL_CART_DATA,
      );
    }

    const { eventDate, roomId } = params;
    const url =
      roomId != null && roomId > 0
        ? API_ENDPOINTS.CUSTOMER.BOOK_EVENT.DELETE_CART_DATA_ROOM.replace(
          "{room_id}",
          String(roomId),
        ).replace("{date}", eventDate)
        : API_ENDPOINTS.CUSTOMER.BOOK_EVENT.DELETE_CART_DATA.replace(
          "{date}",
          eventDate,
        );

    return api.delete<void>(url);
  },
};
