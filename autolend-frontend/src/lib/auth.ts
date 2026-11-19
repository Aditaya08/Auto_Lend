/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { User } from "./types";

export const getToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("autolend_token");
  }
  return null;
};

export const setToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("autolend_token", token);
  }
};

export const clearToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("autolend_token");
    localStorage.removeItem("autolend_user");
  }
};

export const getUser = (): User | null => {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("autolend_user");
    if (userStr) {
      try {
        return JSON.parse(userStr) as User;
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

export const setUser = (user: User) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("autolend_user", JSON.stringify(user));
  }
};
