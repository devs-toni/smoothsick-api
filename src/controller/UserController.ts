import { Request, Response } from "express";
import { FormLogin, FormRegister } from "../entity/User";
import { IGetUserData, IUserLogin, IUserRegister } from "../models/User";
import { UserRepository } from "../repository/UserRepository";
import { tokenGenerator } from "../helpers/tokenGenerator";
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

export const UserController = {
  async register(req: Request, res: Response) {
    const params: FormRegister = req.body;
    const { form } = params;
    await bcrypt.hash(form.password, 10, (error: string, hash: string) => {
      if (error) throw error;
      const user: IUserRegister = {
        name: form.name,
        last_name: form.lastname,
        user_name: form.username,
        email: form.email,
        password: hash,
        token: form.token,
        role: "U",
      };
      const saveUser = UserRepository.save(user);
      saveUser.then((user) => {
        if (typeof user === "undefined")
          return res.status(500).send("Error al registrar");
        if (typeof user === "number")
          return res.status(204).send("User exists");
        return res.status(200).send(saveUser);
      });
    });
  },

  async authenticate(req: Request, res: Response) {
    const params: FormLogin = req.body;
    const { userData } = params;
    const user: IUserLogin = {
      email: userData.email,
      password: userData.password,
      id: userData.id,
    };
    const currentUser = await UserRepository.get(user.email);

    if (typeof currentUser === "undefined")
      return res.status(401).send("Incorrect login data");
    const token = await tokenGenerator(currentUser.id);

    await bcrypt.compare(
      userData.password,
      currentUser?.password,
      (error: string, result: boolean) => {
        if (error) throw error;
        if (result) return res.status(200).send({ token, currentUser });
        if (!result) return res.status(401).send("Incorrect login data");
        return res.status(500).send("Something went wrong");
      }
    );
  },

  async authorizate(_req: Request, res: Response) {
    const user = res.locals.user;
    if (user) {
      const currentUser = await UserRepository.getById(user.id);
      if (currentUser?.role === "A") return res.send(true);
      if (currentUser?.role === "U") return res.send(false);
    }
  },

  async getUserData(req: Request, res: Response) {
    const user = res.locals.user;
    const { id } = user;
    if (id) {
      const currentUser = await UserRepository.getById(id);
      const userToSend: IGetUserData = {
        id: currentUser?.id,
        name: currentUser?.name,
        last_name: currentUser?.last_name,
        user_name: currentUser?.name,
        email: currentUser?.email,
        role: currentUser?.role,
      };
      if (userToSend) return res.status(200).send(userToSend);
      if (!userToSend) return res.status(401).send("User not found");
      return res.status(500).send("Something went wrong");
    }
  },
};
