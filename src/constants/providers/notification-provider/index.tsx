"use client";
import React, { createContext, type PropsWithChildren } from "react";
export interface INotificationContext {
  open?: (key: string) => void;
  close?: (key: string) => void;
}

export type NotificationProvider = Required<INotificationContext>;
export const defaultNotificationProvider: INotificationContext = {};
export const NotificationContext = createContext<INotificationContext>({});
const NotificationProviderComponent: React.FC<
  PropsWithChildren<INotificationContext>
> = ({ open, close, children }) => {
  return (
    <NotificationContext.Provider value={{ open, close }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Wrap the NotificationProviderComponent with React.memo for memoization
export const NotificationProvider = React.memo(NotificationProviderComponent);
