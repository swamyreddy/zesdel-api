import { Router } from "express";
import authRoutes from "./auth.routes";
import otpAuthRoutes from "./otp-auth.routes";
import firebaseAuthRoutes from "./firebase-auth.routes";
import notificationRoutes from "./notification.routes";
import productRoutes from "./product.routes";
import categoryRoutes from "./category.routes";
import addressRoutes from "./address.routes";
import orderRoutes from "./order.routes";
import couponRoutes from "./coupon.routes";
import adminRoutes from "./admin.routes";
import paymentRoutes from "./payment.routes";
import uploadRoutes from "./upload.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/auth/otp", otpAuthRoutes);
router.use("/auth/firebase", firebaseAuthRoutes);
router.use("/users", notificationRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/addresses", addressRoutes);
router.use("/orders", orderRoutes);
router.use("/coupons", couponRoutes);
router.use("/admin", adminRoutes);
router.use("/payments", paymentRoutes);
router.use("/admin/upload", uploadRoutes);

export default router;
