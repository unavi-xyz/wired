import Image from "next/image";
import Link from "next/link";

import { useSession } from "../../../client/auth/useSession";
import LoginButton from "./LoginButton";
import NavbarTab from "./NavbarTab";
import ProfileButton from "./ProfileButton";

export default function Navbar() {
  const { status } = useSession();

  const paddingClass = status !== "unauthenticated" ? "pt-1" : "";

  return (
    <div className="flex h-full w-full justify-center bg-white">
      <div className="max-w-content mx-4 flex justify-between md:grid md:grid-cols-3">
        <div className="flex items-center">
          <Link href="/">
            <div className="relative aspect-square h-10 cursor-pointer">
              <Image src="/images/Logo.png" alt="logo" priority fill sizes="36px" />
            </div>
          </Link>
        </div>

        <div className="flex items-center justify-center space-x-4 md:space-x-5">
          <NavbarTab text="Home" href="/" />
          <NavbarTab text="Explore" href="/explore" />
          <div className="hidden md:flex">
            <NavbarTab text="Create" href="/create" />
          </div>
        </div>

        <div className={`flex items-center justify-end ${paddingClass}`}>
          {status === "unauthenticated" ? <LoginButton /> : <ProfileButton />}
        </div>
      </div>
    </div>
  );
}
