import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { FaTwitter } from "react-icons/fa";
import { MdAdd, MdLink, MdOutlineLocationOn } from "react-icons/md";

import { useLens } from "../../../client/lens/hooks/useLens";
import Button from "../../../ui/Button";
import { isFromCDN } from "../../../utils/isFromCDN";
import MetaTags from "../../MetaTags";
import ProfilePicture from "../../ProfilePicture";
import AttributeRow from "./AttributeRow";
import { ProfileLayoutProps } from "./getProfileLayoutProps";

interface Props extends ProfileLayoutProps {
  children: React.ReactNode;
}

export default function ProfileLayout({
  children,
  handle,
  metadata,
  profile,
  coverImage,
  profileImage,
}: Props) {
  const { handle: viewerHandle } = useLens();

  const twitter = profile?.attributes?.find((item) => item.key === "twitter");
  const website = profile?.attributes?.find((item) => item.key === "website");
  const location = profile?.attributes?.find((item) => item.key === "location");

  return (
    <>
      <MetaTags
        title={metadata.title ?? handle}
        description={metadata.description ?? undefined}
        image={metadata.image ?? undefined}
      />

      <Head>
        <meta property="og:type" content="profile" />
        <meta property="og:profile:username" content={handle} />
        <meta property="og:profile:first_name" content={profile?.name ?? handle} />
      </Head>

      {profile ? (
        <div className="max-w-content mx-auto">
          <div className="h-48 w-full bg-sky-100 md:h-64 lg:rounded-xl">
            <div className="relative h-full w-full object-cover">
              {coverImage &&
                (isFromCDN(coverImage) ? (
                  <Image
                    src={coverImage}
                    priority
                    fill
                    sizes="80vw"
                    alt=""
                    className="h-full w-full object-cover lg:rounded-xl"
                  />
                ) : (
                  <img
                    src={coverImage}
                    alt=""
                    className="h-full w-full object-cover lg:rounded-xl"
                    crossOrigin="anonymous"
                  />
                ))}
            </div>
          </div>

          <div className="flex justify-center px-4 pb-4 md:px-0">
            <div className="flex w-full flex-col items-center space-y-2">
              <div className="z-10 -mt-16 flex w-32 rounded-full ring-4 ring-white">
                <ProfilePicture src={profileImage} circle uniqueKey={handle} size={128} />
              </div>

              <div className="flex flex-col items-center">
                <div className="text-2xl font-black">{handle}</div>
                <div className="text-lg font-bold">{profile.name}</div>
              </div>

              <div className="flex w-full justify-center space-x-4 py-2">
                <div className="flex flex-col items-center md:flex-row md:space-x-1">
                  <div className="text-lg font-black">{profile.stats.totalFollowing}</div>
                  <div className="text-lg leading-5 text-neutral-500">Following</div>
                </div>

                <div className="flex flex-col items-center md:flex-row md:space-x-1">
                  <div className="text-lg font-black">{profile.stats.totalFollowers}</div>
                  <div className="text-lg leading-5 text-neutral-500">Followers</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-center px-4 md:items-start md:px-0">
            <div className="flex w-full flex-col items-center space-y-2">
              <div className="flex w-full justify-center space-x-2">
                {handle === viewerHandle ? (
                  <Link href="/settings">
                    <div>
                      <Button variant="outlined" rounded="small">
                        <div className="px-6">Edit profile</div>
                      </Button>
                    </div>
                  </Link>
                ) : (
                  <div>
                    <Button variant="filled" rounded="small" disabled>
                      <div className="flex items-center justify-center space-x-1 px-6">
                        <MdAdd />
                        <div>Follow</div>
                      </div>
                    </Button>
                  </div>
                )}

                {twitter && (
                  <Button variant="outlined" rounded="small">
                    <a
                      href={`https://twitter.com/${twitter.value}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      <FaTwitter className="text-lg" />
                    </a>
                  </Button>
                )}
              </div>

              <div className="w-full pt-2">
                <div className="whitespace-pre-line text-center">{profile.bio}</div>
              </div>

              <div className="flex flex-wrap space-x-4">
                {location && (
                  <AttributeRow icon={<MdOutlineLocationOn />}>{location.value}</AttributeRow>
                )}

                {website && (
                  <AttributeRow icon={<MdLink />}>
                    <a
                      href={website.value}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {website.value}
                    </a>
                  </AttributeRow>
                )}
              </div>
            </div>

            <div className="mt-6 w-full">{children}</div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center pt-12 text-lg">User not found.</div>
      )}
    </>
  );
}
