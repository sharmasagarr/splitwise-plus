import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  generateOtp,
  getOtpExpiry,
  getOtpResendWaitSeconds,
  hashOtp,
  isOtpResendAllowed,
  OTP_LIMITS,
  sendSignupOtpEmail,
} from "./otp.service.js";
import {
  buildUsernameBaseFromName,
  generateUniqueUsername,
} from "../user/username.util.js";

export const authResolvers = {
  Mutation: {
    signup: async (_: any, { name, email, password }: any, { prisma }: any) => {
      const trimmedName = (name || "").trim();
      const trimmedEmail = (email || "").trim().toLowerCase();
      const isValidName =
        trimmedName.length >= 2 &&
        trimmedName.length <= 50 &&
        trimmedName
          .split("")
          .every(
            (ch: string) =>
              (ch >= "a" && ch <= "z") ||
              (ch >= "A" && ch <= "Z") ||
              ch === " ",
          );
      if (!isValidName) {
        throw new Error(
          "Invalid name. Only letters and spaces are allowed (2-50 characters).",
        );
      }

      if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
        throw new Error("Invalid email address");
      }

      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      const existing = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });

      if (existing?.emailVerified) {
        throw new Error("User already exists with this email");
      }

      const hash = await bcrypt.hash(password, 10);
      const otp = generateOtp();
      const otpHash = hashOtp(otp);
      const otpExpiry = getOtpExpiry();

      if (existing && !isOtpResendAllowed(existing.emailOtpLastSentAt)) {
        const waitSeconds = getOtpResendWaitSeconds(existing.emailOtpLastSentAt);
        throw new Error(`Please wait ${waitSeconds}s before requesting another OTP`);
      }

      let user = existing;
      const generatedUsername = await generateUniqueUsername(
        prisma,
        buildUsernameBaseFromName(trimmedName),
        existing?.id,
      );

      if (!user) {
        user = await prisma.user.create({
          data: {
            name: trimmedName,
            username: generatedUsername,
            email: trimmedEmail,
            passwordHash: hash,
            emailVerified: false,
            emailOtpHash: otpHash,
            emailOtpExpiresAt: otpExpiry,
            emailOtpAttempts: 0,
            emailOtpLastSentAt: new Date(),
            locale: "en-IN",
            bio: "Managing expenses smartly with friends and family.",
          },
        });
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: trimmedName,
            username: user.username ?? generatedUsername,
            passwordHash: hash,
            emailVerified: false,
            emailOtpHash: otpHash,
            emailOtpExpiresAt: otpExpiry,
            emailOtpAttempts: 0,
            emailOtpLastSentAt: new Date(),
            locale: "en-IN",
            bio: user.bio ?? "Managing expenses smartly with friends and family.",
          },
        });
      }

      await sendSignupOtpEmail({
        to: trimmedEmail,
        name: user.name,
        otp,
      });

      return {
        success: true,
        message: "OTP sent to your email",
        email: trimmedEmail,
      };
    },

    verifySignupOtp: async (_: any, { email, otp }: any, { prisma }: any) => {
      const trimmedEmail = (email || "").trim().toLowerCase();
      const cleanOtp = String(otp || "").trim();

      if (!/^\d{6}$/.test(cleanOtp)) {
        throw new Error("Invalid OTP format");
      }

      const user = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });

      if (!user || !user.passwordHash) {
        throw new Error("User not found");
      }

      if (user.emailVerified) {
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });
        return { token, user };
      }

      if (!user.emailOtpHash || !user.emailOtpExpiresAt) {
        throw new Error("OTP not requested. Please sign up again.");
      }

      if (user.emailOtpAttempts >= OTP_LIMITS.OTP_MAX_VERIFY_ATTEMPTS) {
        throw new Error("Too many failed attempts. Please request a new OTP.");
      }

      if (user.emailOtpExpiresAt.getTime() < Date.now()) {
        throw new Error("OTP has expired. Please request a new OTP.");
      }

      const isValidOtp = hashOtp(cleanOtp) === user.emailOtpHash;

      if (!isValidOtp) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailOtpAttempts: { increment: 1 } },
        });
        throw new Error("Invalid OTP");
      }

      const verifiedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailOtpHash: null,
          emailOtpExpiresAt: null,
          emailOtpAttempts: 0,
          emailOtpLastSentAt: null,
        },
      });

      const token = jwt.sign({ userId: verifiedUser.id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      return { token, user: verifiedUser };
    },

    resendSignupOtp: async (_: any, { email }: any, { prisma }: any) => {
      const trimmedEmail = (email || "").trim().toLowerCase();

      const user = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });

      if (!user || !user.passwordHash) {
        throw new Error("User not found");
      }

      if (user.emailVerified) {
        throw new Error("Email already verified");
      }

      if (!isOtpResendAllowed(user.emailOtpLastSentAt)) {
        const waitSeconds = getOtpResendWaitSeconds(user.emailOtpLastSentAt);
        throw new Error(`Please wait ${waitSeconds}s before requesting another OTP`);
      }

      const otp = generateOtp();
      const otpHash = hashOtp(otp);
      const otpExpiry = getOtpExpiry();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailOtpHash: otpHash,
          emailOtpExpiresAt: otpExpiry,
          emailOtpAttempts: 0,
          emailOtpLastSentAt: new Date(),
        },
      });

      await sendSignupOtpEmail({
        to: trimmedEmail,
        name: user.name,
        otp,
      });

      return {
        success: true,
        message: "OTP resent to your email",
        email: trimmedEmail,
      };
    },

    login: async (_: any, { email, password }: any, { prisma }: any) => {
      const trimmedEmail = (email || "").trim().toLowerCase();

      const user = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });

      if (!user?.passwordHash) {
        throw new Error("Invalid email or password");
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        throw new Error("Invalid email or password");
      }

      if (!user.emailVerified) {
        throw new Error("Email not verified. Please verify your OTP.");
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      return { token, user };
    },

    logout: async () => {
      return true;
    },
  },
};
