import { Router } from "express";
import authRoutes from "./auth.routes";
import otpAuthRoutes from "./otp-auth.routes";
import productRoutes from "./product.routes";
import categoryRoutes from "./category.routes";
import addressRoutes from "./address.routes";
import orderRoutes from "./order.routes";
import couponRoutes from "./coupon.routes";
import adminRoutes from "./admin.routes";
import uploadRoutes from "./upload.routes";
import settingsRoutes from "./settings.routes";
import deliveryRoutes from "./delivery.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/auth/otp", otpAuthRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/addresses", addressRoutes);
router.use("/orders", orderRoutes);
router.use("/coupons", couponRoutes);
router.use("/admin", adminRoutes);
router.use("/admin/upload", uploadRoutes);
router.use("/settings", settingsRoutes);
router.use("/admin/settings", settingsRoutes);
router.use("/delivery", deliveryRoutes);

export default router;
