"use client";

import { Button } from "@/components/ui/button";
import { useOAuth } from "@/hooks/useOAuth";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { toast } from "sonner";
import { TenantRole } from "@/constants/oauth.constants";

interface OAuthButtonsProps {
  callbackUrl?: string;
  tenant?: string;
  website_role?: string;
  account_type?: string;
  parentDomain?: string;
  className?: string;
}

export const OAuthButtons = ({
  callbackUrl,
  tenant,
  website_role,
  account_type,
  parentDomain,
  className = "",
}: OAuthButtonsProps) => {
  const { signInWithGoogle, signInWithFacebook, isLoading, error } = useOAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle({
        callbackUrl,
        tenant,
        website_role: website_role as TenantRole,
        account_type,
        parentDomain,
      });
    } catch (err) {
      console.error("🔍 Google Sign In Error:", err);
      toast.error("Failed to sign in with Google");
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      await signInWithFacebook({
        callbackUrl,
        tenant,
        website_role: website_role as TenantRole,
        account_type,
        parentDomain,
      });
    } catch (err) {
      console.error("🔍 Facebook Sign In Error:", err);
      toast.error("Failed to sign in with Facebook");
    }
  };

  if (error) {
    toast.error(error);
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Google */}
      <Button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="
          h-11 w-full
          bg-[var(--color-socialLogin-google,#1a73e8)]
          text-white
          relative flex items-center justify-center
          hover:opacity-90
          active:opacity-80
          hover:-translate-y-[1px]
          hover:shadow-md
          transition-all
          duration-200
          focus-visible:ring-2
          focus-visible:ring-white/40
          focus-visible:ring-offset-2
          focus-visible:ring-offset-transparent
        "
      >
        <div className="absolute left-1 top-1/2 -translate-y-1/2 bg-white p-2.5 rounded-l">
          <FcGoogle className="h-5 w-5" />
        </div>

        <span className="font-sans text-sm font-medium">
          Continue with Google
        </span>
      </Button>

      {/* Facebook */}
      <Button
        type="button"
        onClick={handleFacebookSignIn}
        disabled={isLoading}
        className="
          h-11 w-full
          bg-[var(--color-socialLogin-microsoft,#1877f2)]
          text-white
          relative flex items-center justify-center
          hover:opacity-90
          active:opacity-80
          hover:-translate-y-[1px]
          hover:shadow-md
          transition-all
          duration-200
          focus-visible:ring-2
          focus-visible:ring-white/40
          focus-visible:ring-offset-2
          focus-visible:ring-offset-transparent
        "
      >
        <div className="absolute left-1 top-1/2 -translate-y-1/2 bg-white p-2.5 rounded-l">
          <FaFacebook className="h-5 w-5 text-[#1877f2]" />
        </div>

        <span className="font-sans text-sm font-medium">
          Continue with Facebook
        </span>
      </Button>
    </div>
  );
};
