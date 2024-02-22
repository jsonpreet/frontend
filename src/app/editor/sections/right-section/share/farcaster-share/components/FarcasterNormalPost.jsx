import { useContext, useEffect, useState } from "react";
import { shareOnSocials } from "../../../../../../../services";
import { toast } from "react-toastify";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Context } from "../../../../../../../providers/context/ContextProvider";
import {
  getFromLocalStorage,
  errorMessage,
  jsConfettiFn,
  addressCrop,
} from "../../../../../../../utils";
import { useLocalStorage, useReset } from "../../../../../../../hooks/app";
import { ERROR, FRAME_LINK, LOCAL_STORAGE } from "../../../../../../../data";
import { Button } from "@material-tailwind/react";
import { EVMWallets } from "../../../../top-section/auth/wallets";
import FarcasterAuth from "./FarcasterAuth";
import FarcasterChannel from "./FarcasterChannel";
import { Switch } from "@headlessui/react";
import { ZoraDialog } from "../../zora-mint/components";
import logoFarcaster from "../../../../../../../assets/logos/logoFarcaster.jpg";
import {
  getFrame,
  getOrCreateWallet,
  postFrame,
} from "../../../../../../../services/apis/BE-apis";
import { InputErrorMsg, NumberInputBox } from "../../../../../common";
import Topup from "./Topup";
import { useAccount } from "wagmi";
import WithdrawFunds from "./WithdrawFunds";

const FarcasterNormalPost = () => {
  const { resetState } = useReset();
  const { address } = useAccount();
  const getEVMAuth = getFromLocalStorage(LOCAL_STORAGE.evmAuth);

  // farcaster states
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [isShareSuccess, setIsShareSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [farTxHash, setFarTxHash] = useState("");

  // frame POST states
  const [isPostingFrame, setIsPostingFrame] = useState(false);
  const [isPostingFrameError, setIsPostingFrameError] = useState(false);
  const [isPostingFrameSuccess, setIsPostingFrameSuccess] = useState(false);
  const [frameId, setFrameId] = useState(null);

  const {
    postName,
    postDescription,
    contextCanvasIdRef,
    setFarcasterStates,
    farcasterStates, // don't remove this
    lensAuthState, // don't remove this
  } = useContext(Context);

  const { isFarcasterAuth } = useLocalStorage();

  const {
    data: walletData,
    isError: isWalletError,
    isLoading: isWalletLoading,
    error: walletError,
    isSuccess: isWalletSuccess,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: ["getOrCreateWallet"],
    queryFn: () => getOrCreateWallet(),
    enabled: true,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnSettled: false,
    retry: false,
    retryOnMount: false,
    retryOnReconnect: false,
    retryOnSettled: false,
    staleTime: 2_000,
    cacheTime: 2_000,
  });

  const { mutateAsync: postFrameData } = useMutation({
    mutationKey: "postFrameData",
    mutationFn: postFrame,
  });

  const { mutateAsync: shareOnFarcaster } = useMutation({
    mutationKey: "shareOnFarcaster",
    mutationFn: shareOnSocials,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFarcasterStates((prevState) => {
      // Create a new state based on the previous state
      const newState = {
        ...prevState,
        frameData: {
          ...prevState.frameData,
          allowedMints: value,
        },
      };

      // Check if the name is "allowedMints" and perform validation
      if (name === "allowedMints") {
        if (!value || value <= 0) {
          newState.frameData.allowedMintsIsError = true;
          newState.frameData.allowedMintsError =
            "Please enter a valid number of mints";
        } else {
          newState.frameData.allowedMintsIsError = false;
          newState.frameData.allowedMintsError = "";
        }
      }

      // Return the new state
      return newState;
    });
  };

  const postFrameDataFn = async () => {
    setIsPostingFrame(true);
    postFrameData({
      canvasId: contextCanvasIdRef.current,
      owner: address,
      isTopUp: farcasterStates.frameData?.isTopup,
      allowedMints: parseInt(farcasterStates.frameData?.allowedMints),
      metadata: {
        name: postName,
        description: postDescription,
      },
      isLike: farcasterStates.frameData?.isLike,
      isRecast: farcasterStates.frameData?.isRecast,
      isFollow: farcasterStates.frameData?.isFollow,
    })
      .then((res) => {
        if (res?.status === "success") {
          setFrameId(res?.frameId);
          setIsPostingFrame(false);
          setIsPostingFrameSuccess(true);
        } else if (res?.error) {
          setIsPostingFrameError(true);
          toast.error(res?.error);
        }
      })
      .catch((err) => {
        setIsPostingFrameError(true);
        toast.error(errorMessage(err));
      });
  };

  const monetizationSettings = () => {
    let canvasParams = {};

    if (farcasterStates.isChannel) {
      canvasParams = {
        ...canvasParams,
        zoraMintLink: "",
        channelId: farcasterStates.channel?.id,
      };
    }

    if (farcasterStates.frameData?.isFrame) {
      canvasParams = {
        ...canvasParams,
        frameLink: FRAME_LINK + frameId,
      };
    }

    return canvasParams;
  };

  // share post on lens
  const sharePost = async (platform) => {
    setIsShareLoading(true);

    const canvasData = {
      id: contextCanvasIdRef.current,
      name: "Farcaster post",
      content: postDescription,
    };

    shareOnFarcaster({
      canvasData: canvasData,
      canvasParams: monetizationSettings(),
      platform: platform,
    })
      .then((res) => {
        if (res?.txHash) {
          setIsShareLoading(false);
          setFarTxHash(res?.txHash);
          setIsShareSuccess(true);

          // open the dialog
        } else if (res?.error || res?.reason === "REJECTED") {
          setIsError(true);
          setIsShareLoading(false);
          toast.error(res?.error);
        }
      })
      .catch((err) => {
        setIsError(true);
        setIsShareLoading(false);
        toast.error(errorMessage(err));
      });
  };

  const handleSubmit = () => {
    // check if canvasId is provided
    if (contextCanvasIdRef.current === null) {
      toast.error("Please select a design");
      return;
    }

    // check if name is provided
    if (!postName) {
      toast.error("Please provide a name");
      return;
    }

    // check if description is provided
    if (!postDescription) {
      toast.error("Please provide a description");
      return;
    }

    // check if allowed mint is provided
    if (
      farcasterStates.frameData?.isFrame &&
      (farcasterStates.frameData?.allowedMintsIsError ||
        !farcasterStates.frameData?.allowedMints)
    ) {
      toast.error("Please enter number of mints");
      return;
    }

    if (
      farcasterStates.frameData?.isFrame &&
      farcasterStates.frameData?.allowedMints > walletData?.sponsored &&
      !farcasterStates.frameData?.isSufficientBalance
    ) {
      toast.error(`Insufficient balance. Please topup your account to mint`);
      return;
    }

    if (farcasterStates.frameData?.isFrame) {
      // upload to IPFS
      postFrameDataFn();
    } else {
      sharePost("farcaster");
    }
  };

  useEffect(() => {
    if (isPostingFrameSuccess) {
      sharePost("farcaster");
    }
  }, [isPostingFrameSuccess]);

  console.log("Topup balance", walletData?.balance);

  return (
    <>
      <ZoraDialog
        title="Share on Farcaster"
        icon={logoFarcaster}
        isError={isError || isPostingFrameError}
        isLoading={false}
        isCreatingSplit={null}
        isUploadingToIPFS={isPostingFrame}
        isPending={null}
        isShareLoading={isShareLoading}
        isShareSuccess={isShareSuccess}
        isOpenAction={false}
        isFarcaster={true}
        data={null}
        farTxHash={farTxHash}
        isSuccess={false}
        isFrame={farcasterStates.frameData?.isFrame}
        frameId={frameId}
      />
      <div className="mb-4 m-4">
        <div className="flex justify-between">
          <h2 className="text-lg mb-2"> Channel </h2>
          <Switch
            checked={farcasterStates.isChannel}
            onChange={() =>
              setFarcasterStates({
                ...farcasterStates,
                isChannel: !farcasterStates.isChannel,
              })
            }
            className={`${
              farcasterStates.isChannel ? "bg-[#e1f16b]" : "bg-gray-200"
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#e1f16b] focus:ring-offset-2`}
          >
            <span
              className={`${
                farcasterStates.isChannel ? "translate-x-6" : "translate-x-1"
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />{" "}
          </Switch>
        </div>
        <div className="w-4/5 opacity-75">
          {" "}
          Share your post in the Farcaster channel.{" "}
        </div>
      </div>
      <div className={`m-4 ${!farcasterStates.isChannel && "hidden"}`}>
        <FarcasterChannel />
      </div>

      <div className="mb-4 m-4">
        <div className="flex justify-between">
          <h2 className="text-lg mb-2"> Share as Frame </h2>
          <Switch
            checked={farcasterStates.frameData?.isFrame}
            onChange={() =>
              setFarcasterStates({
                ...farcasterStates,
                frameData: {
                  ...farcasterStates.frameData,
                  isFrame: !farcasterStates.frameData?.isFrame,
                },
              })
            }
            className={`${
              farcasterStates.frameData?.isFrame
                ? "bg-[#e1f16b]"
                : "bg-gray-200"
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#e1f16b] focus:ring-offset-2`}
          >
            <span
              className={`${
                farcasterStates.frameData?.isFrame
                  ? "translate-x-6"
                  : "translate-x-1"
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />{" "}
          </Switch>
        </div>
        <div className="w-4/5 opacity-75">
          {" "}
          Share as Mintable Frame on Farcaster.{" "}
        </div>
      </div>

      <div
        className={`${!farcasterStates.frameData?.isFrame && "hidden"} mx-4`}
      >
        <h2 className="text-lg mb-2"> Gate with </h2>
        <div className="flex justify-between py-2">
          <h2 className="text-lg mb-2"> Like </h2>
          <Switch
            checked={farcasterStates.frameData?.isLike}
            onChange={() =>
              setFarcasterStates({
                ...farcasterStates,
                frameData: {
                  ...farcasterStates.frameData,
                  isLike: !farcasterStates.frameData?.isLike,
                },
              })
            }
            className={`${
              farcasterStates.frameData?.isLike ? "bg-[#e1f16b]" : "bg-gray-200"
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#e1f16b] focus:ring-offset-2`}
          >
            <span
              className={`${
                farcasterStates.frameData?.isLike
                  ? "translate-x-6"
                  : "translate-x-1"
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />{" "}
          </Switch>
        </div>

        <div className="flex justify-between py-2">
          <h2 className="text-lg mb-2"> Recast </h2>
          <Switch
            checked={farcasterStates.frameData?.isRecast}
            onChange={() =>
              setFarcasterStates({
                ...farcasterStates,
                frameData: {
                  ...farcasterStates.frameData,
                  isRecast: !farcasterStates.frameData?.isRecast,
                },
              })
            }
            className={`${
              farcasterStates.frameData?.isRecast
                ? "bg-[#e1f16b]"
                : "bg-gray-200"
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#e1f16b] focus:ring-offset-2`}
          >
            <span
              className={`${
                farcasterStates.frameData?.isRecast
                  ? "translate-x-6"
                  : "translate-x-1"
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />{" "}
          </Switch>
        </div>

        <div className="flex justify-between py-2">
          <h2 className="text-lg mb-2"> Follow </h2>
          <Switch
            checked={farcasterStates.frameData?.isFollow}
            onChange={() =>
              setFarcasterStates({
                ...farcasterStates,
                frameData: {
                  ...farcasterStates.frameData,
                  isFollow: !farcasterStates.frameData?.isFollow,
                },
              })
            }
            className={`${
              farcasterStates.frameData?.isFollow
                ? "bg-[#e1f16b]"
                : "bg-gray-200"
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#e1f16b] focus:ring-offset-2`}
          >
            <span
              className={`${
                farcasterStates.frameData?.isFollow
                  ? "translate-x-6"
                  : "translate-x-1"
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />{" "}
          </Switch>
        </div>

        <div className="my-2">
          <p className="text-sm">
            {" "}
            {walletData?.sponsored > 0
              ? `${
                  walletData?.sponsored
                } mints are free. Topup with Base ETH if you want
              to drop more than ${walletData?.sponsored} mints ${" "}`
              : "You don't have any free mint. please Topup with Base ETH to mint"}{" "}
          </p>
          <p className="text-end mt-4">
            <span>Topup account:</span>
            <span
              className="text-blue-500 cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(walletData?.publicAddress);
                toast.success("Copied topup account address");
              }}
            >
              {" "}
              {addressCrop(walletData?.publicAddress)}
            </span>
          </p>
          <p className="text-end">
            <span>Topup balance:</span> {walletData?.balance} Base ETH
          </p>
          <div className="flex flex-col w-full py-2">
            <NumberInputBox
              min={1}
              step={1}
              label="Allowed Mints"
              name="allowedMints"
              onChange={(e) => handleChange(e)}
              onFocus={(e) => handleChange(e)}
              value={farcasterStates.frameData.allowedMints}
            />
          </div>

          {farcasterStates.frameData?.allowedMintsIsError && (
            <InputErrorMsg
              message={farcasterStates.frameData?.allowedMintsError}
            />
          )}

          {farcasterStates.frameData?.allowedMints > walletData?.sponsored && (
            <Topup
              topUpAccount={walletData?.publicAddress}
              balance={walletData?.balance}
              refetch={refetchWallet}
              sponsored={walletData?.sponsored}
            />
          )}

          {walletData?.balance > 0 && (
            <WithdrawFunds refetchWallet={refetchWallet} />
          )}
        </div>
      </div>

      <div className="flex flex-col bg-white shadow-2xl rounded-lg rounded-r-none">
        {!getEVMAuth ? (
          <EVMWallets title="Login with EVM" className="mx-2" />
        ) : !isFarcasterAuth ? (
          <FarcasterAuth />
        ) : (
          <div className="mx-2 my-2 outline-none">
            <Button
              className="w-full outline-none"
              onClick={handleSubmit}
              // color="yellow"
            >
              Share
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default FarcasterNormalPost;
