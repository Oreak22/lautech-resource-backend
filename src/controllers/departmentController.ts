import { Request, Response } from "express";
import { Department } from "../models/Department";

export const getAllDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await Department.find({}).sort({ name: 1 });
    res.status(200).json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch departments" });
  }
};


export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Department name is required" });
    }
    const existing = await Department.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, error: "Department already exists" });
    }
    const department = await Department.create({ name });
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to create department" });
  }
};
