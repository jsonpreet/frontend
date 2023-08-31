import { useContext, useState, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import TiDelete from "@meronex/icons/ti/TiDelete";
import BsArrowLeft from "@meronex/icons/bs/BsArrowLeft";
import { Switch } from "@headlessui/react";

import animationData from "../../../../../../assets/lottie/alertAnimation2.json";

// Working Yet - change from headlessui/react to blueprintjs/core
// import { Switch } from "@blueprintjs/core";

import {
  checkDispatcher,
  lensAuthenticate,
  setDispatcher,
  shareOnSocials,
  lensChallenge,
  lensHub,
  signSetDispatcherTypedData,
  splitSignature,
  ENVIRONMENT,
} from "../../../../../../services";
import { toast } from "react-toastify";
import { DateTimePicker } from "@atlaskit/datetime-picker";
import BsLink45Deg from "@meronex/icons/bs/BsLink45Deg";
import AiOutlinePlus from "@meronex/icons/ai/AiOutlinePlus";
import { useMutation } from "@tanstack/react-query";
import { Context } from "../../../../../../context/ContextProvider";
import {
  getFromLocalStorage,
  saveToLocalStorage,
  fnMessage,
  isEthAddress,
  isLensHandle,
} from "../../../../../../utils";
import testnetTokenAddress from "../../../../../../data/json/testnet-token-list.json";
import mainnetTokenAddress from "../../../../../../data/json/mainnet-token-list.json";
import { InputBox, InputErrorMsg, NumberInputBox } from "../../../../common";
import { useStore } from "../../../../../../hooks";
// import SplitPolicyCard from "../../../../../../data/constant/SplitPolicyCard";
import BsX from "@meronex/icons/bs/BsX";
import { SplitPolicyCard } from "./components";

const LensShare = () => {
  const store = useStore();
  const { address, isConnected } = useAccount();
  const [dispatcherState, setDispatcherState] = useState({
    message: false,
    profileId: "",
  });
  const {
    setIsLoading,
    setText,
    setMenu,
    postDescription,
    setPostDescription,
    enabled,
    setEnabled,
    stFormattedTime,
    stFormattedDate,
    contextCanvasIdRef,
    referredFromRef,
    isShareOpen,
    setIsShareOpen,
    priceError,
    setPriceError,
    splitError,
    setSplitError,
    editionError,
    setEditionError,
    referralError,
    setReferralError,
  } = useContext(Context);
  const {
    data: signature,
    isError,
    isSuccess,
    error,
    signMessage,
  } = useSignMessage();
  const getLensAuth = getFromLocalStorage("lensAuth");
  const [duplicateAddressError, setDuplicateAddressError] = useState(false);
  const [percentageError, setPercentageError] = useState("");
  const [sharing, setSharing] = useState(false);
  const { mutateAsync: shareOnLens } = useMutation({
    mutationKey: "shareOnLens",
    mutationFn: shareOnSocials,
  });

  // generating signature
  const generateSignature = async () => {
    const message = await lensChallenge(address);
    setIsLoading(true);
    setSharing(true);
    signMessage({
      message,
    });
    setText("Sign the message to authenticate");
  };

  // authenticating signature on lens
  const lensAuth = async () => {
    setSharing(true);
    setText("Authenticating...");
    const res = await lensAuthenticate(signature);
    if (res?.data) {
      saveToLocalStorage("lensAuth", true);
      toast.success("Successfully authenticated");
      setIsLoading(false);
      setText("");
      checkDispatcherFn();
      setTimeout(() => {
        // check the dispatcher
        // if true => sharePost
        if (dispatcherState.message === true) {
          sharePost("lens");
          // console.log("share on lens");
        } else if (dispatcherState.message === false) {
          // else => set the dispatcher
          setDispatcherFn();
        }
      }, 4000);
    } else if (res?.error) {
      toast.error(res?.error);
      setSharing(false);
      setIsLoading(false);
      setText("");
    }
  };

  // check for dispatcher
  const checkDispatcherFn = async () => {
    const res = await checkDispatcher();
    if (res?.message === true) {
      setDispatcherState({
        message: true,
        profileId: res?.profileId,
      });
    } else if (res?.message === false) {
      setDispatcherState({
        message: false,
        profileId: res?.profileId,
      });
    } else if (res?.error) {
      return toast.error(res?.error);
    }
  };

  // set the dispatcher true or false
  const setDispatcherFn = async () => {
    try {
      setSharing(true);
      setIsLoading(true);
      setText("Sign the message to enable dispatcher");

      const setDispatcherRequest = await setDispatcher();

      const signedResult = await signSetDispatcherTypedData(
        setDispatcherRequest
      );

      const typedData = signedResult.typedData;
      const { v, r, s } = splitSignature(signedResult.signature);
      const tx = await lensHub.setDispatcherWithSig({
        profileId: typedData.value.profileId,
        dispatcher: typedData.value.dispatcher,
        sig: {
          v,
          r,
          s,
          deadline: typedData.value.deadline,
        },
      });
      // checkDispatcherFn();
      // console.log("successfully set dispatcher: tx hash", tx.hash);
      // if tx.hash? => sharePost()
      if (tx.hash) {
        setIsLoading(false);
        setText("");
        toast.success("Dispatcher enabled");
        setTimeout(() => {
          sharePost("lens");
        }, 4000);
      }
    } catch (err) {
      console.log("error setting dispatcher: ", err);
      toast.error("Error setting dispatcher");
      setSharing(false);
      setIsLoading(false);
      setText("");
    }
  };

  // Calendar Functions:
  const onCalChange = (value, dateString) => {
    const dateTime = new Date(value);

    // Format the date
    const dateOptions = { year: "numeric", month: "long", day: "numeric" };

    // Format the time
    const timeOptions = {
      hour: "numeric",
      minute: "numeric",
      timeZoneName: "short",
    };

    setEnabled({
      ...enabled,
      endTimestamp: {
        date: dateTime.toLocaleDateString(undefined, dateOptions),
        time: dateTime.toLocaleTimeString(undefined, timeOptions),
      },
    });
  };

  // get the list of tokens from json file
  const tokenList = () => {
    if (ENVIRONMENT === "localhost" || ENVIRONMENT === "development") {
      return testnetTokenAddress.tokens;
    } else {
      return mainnetTokenAddress.tokens;
    }
  };

  // get contract address acoording to currency
  const tokenAddress = (currency) => {
    const tokenListArr = tokenList();
    for (let i = 0; i < tokenListArr.length; i++) {
      if (tokenListArr[i].symbol === currency) {
        return tokenListArr[i].address;
      }
    }
  };

  // formate date and time in ISO 8601 format for monatizationn settings
  const formatDateTimeISO8601 = (date, time) => {
    if (!date || !time) return;
    const dateTime = new Date(`${date} ${time}`);
    return dateTime.toISOString();
  };

  // format date and time in unix format for schedule post
  const formatDateTimeUnix = (date, time) => {
    if (!date || !time) return;
    const dateTime = new Date(`${date} ${time}`);
    return dateTime.getTime();
  };

  // monatization settings
  const monatizationSettings = () => {
    if (
      !enabled.chargeForCollect &&
      !enabled.limitedEdition &&
      !enabled.timeLimit &&
      !enabled.whoCanCollect
    ) {
      return false;
    }

    let canvasParams = {
      collectModule: {
        multirecipientFeeCollectModule: {
          followerOnly: enabled.whoCanCollect,
        },
      },
    };

    if (enabled.chargeForCollect) {
      canvasParams.collectModule.multirecipientFeeCollectModule = {
        ...canvasParams.collectModule.multirecipientFeeCollectModule,
        amount: {
          currency: tokenAddress(enabled.chargeForCollectCurrency),
          value: enabled.chargeForCollectPrice,
        },
      };
    }

    if (enabled.chargeForCollect) {
      canvasParams.collectModule.multirecipientFeeCollectModule = {
        ...canvasParams.collectModule.multirecipientFeeCollectModule,
        recipients: enabled.splitRevenueRecipients,
      };
    }

    if (enabled.mirrorReferralReward) {
      canvasParams.collectModule.multirecipientFeeCollectModule = {
        ...canvasParams.collectModule.multirecipientFeeCollectModule,
        referralFee: enabled.mirrorReferralRewardFee,
      };
    }

    if (enabled.limitedEdition) {
      canvasParams.collectModule.multirecipientFeeCollectModule = {
        ...canvasParams.collectModule.multirecipientFeeCollectModule,
        collectLimit: enabled.limitedEditionNumber,
      };
    }

    if (enabled.timeLimit) {
      canvasParams.collectModule.multirecipientFeeCollectModule = {
        ...canvasParams.collectModule.multirecipientFeeCollectModule,
        endTimestamp: formatDateTimeISO8601(
          enabled.endTimestamp.date,
          enabled.endTimestamp.time
        ),
      };
    }

    return canvasParams;
  };

  // funtions to handle split revenue
  const addRecipient = () => {
    if (enabled.splitRevenueRecipients.length < 5) {
      setEnabled({
        ...enabled,
        splitRevenueRecipients: [
          ...enabled.splitRevenueRecipients,
          { recipient: "", split: 1.0 },
        ],
      });
    }
  };

  const removeRecipient = (index) => {
    const updatedRecipients = enabled.splitRevenueRecipients.filter(
      (_, i) => i !== index
    );
    setEnabled({
      ...enabled,
      splitRevenueRecipients: updatedRecipients,
    });
    setSplitError({
      isError: false,
      message: "",
    });
  };

  // check if recipient address is same
  const isAddressDuplicate = () => {
    const arr = enabled.splitRevenueRecipients;
    let isError = false;
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length; j++) {
        if (i !== j && arr[i].recipient === arr[j].recipient) {
          isError = true;
          break;
        }
      }
    }

    return isError;
  };

  // check if recipient percentage is more than 100
  const isPercentage100 = () => {
    const arr = enabled.splitRevenueRecipients;
    let totalPercentage = 0;
    for (let i = 0; i < arr.length; i++) {
      totalPercentage += arr[i].split;
    }

    if (totalPercentage == 100) {
      return true;
    } else {
      return false;
    }
  };

  // function to handel recipient field change
  const handleRecipientChange = (index, field, value) => {
    // check index 0 price should min 10
    if (field === "split" && index === 0) {
      if (value < 10 || value > 100 || isNaN(value)) {
        setSplitError({
          isError: true,
          message: "Platform fee should be between 10% to 100%",
        });
      } else {
        setSplitError({
          isError: false,
          message: "",
        });
      }
    }

    // any index price should be greater min 1 and max 100
    if (field === "split" && index !== 0) {
      if (value < 1 || value > 100 || isNaN(value)) {
        setSplitError({
          isError: true,
          message: "Split should be between 1% to 100%",
        });
      } else {
        setSplitError({
          isError: false,
          message: "",
        });
      }
    }

    // check if the address is not same
    if (field === "recipient") {
      // check if the address is valid
      if (value.startsWith("0x") && !isEthAddress(value)) {
        setSplitError({
          isError: true,
          message: "Invalid recipient address",
        });
        // check if the handle is valid
      } else if (value.startsWith("@") && !isLensHandle(value)) {
        setSplitError({
          isError: true,
          message: "Invalid recipient handle",
        });
        // check if  its a random text
      } else if (!value.startsWith("0x") && !value.startsWith("@")) {
        setSplitError({
          isError: true,
          message: "Invalid recipient value",
        });
      } else {
        setSplitError({
          isError: false,
          message: "",
        });
      }
    }

    const updatedRecipients = [...enabled.splitRevenueRecipients];
    updatedRecipients[index][field] = value;
    setEnabled({
      ...enabled,
      splitRevenueRecipients: updatedRecipients,
    });
  };

  // share post on lens
  const sharePost = async (platform) => {
    // check if canvasId is provided
    if (contextCanvasIdRef.current === null) {
      toast.error("Please select a design");
      return;
    }
    // check if description is provided
    if (!postDescription) {
      toast.error("Please provide a description");
      return;
    }

    if (enabled.chargeForCollect) {
      if (priceError.isError) return;

      if (referralError.isError) return;

      if (splitError.isError) return;

      if (isAddressDuplicate()) {
        setSplitError({
          isError: true,
          message: "Duplicate address or handle found",
        });
        return;
      } else if (!isPercentage100()) {
        setSplitError({
          isError: true,
          message: "Total split should be 100%",
        });
        return;
      } else {
        setSplitError({
          isError: false,
          message: "",
        });
      }
    }

    if (enabled.limitedEdition) {
      if (editionError.isError) return;
    }

    setSharing(true);

    const canvasData = {
      id: contextCanvasIdRef.current,
      name: "post",
      content: postDescription,
    };

    const id = toast.loading(`Sharing on ${platform}...`);
    shareOnLens({
      canvasData: canvasData,
      canvasParams: monatizationSettings(),
      platform: platform,
      timeStamp: formatDateTimeUnix(stFormattedDate, stFormattedTime),
    })
      .then((res) => {
        if (res?.txHash) {
          const jsConfetti = new JSConfetti();
          jsConfetti.addConfetti({
            emojis: ["🌈", "⚡️", "💥", "✨", "💫", "🌸"],
            confettiNumber: 100,
          });
          toast.update(id, {
            render: `Successfully shared on ${platform}`,
            type: "success",
            isLoading: false,
            autoClose: 3000,
            closeButton: true,
          });
          setSharing(false);
          setPostDescription("");
          referredFromRef.current = [];
          store.clear({ keepHistory: true });
          store.addPage();
          setEnabled({
            chargeForCollect: false,
            chargeForCollectPrice: "1",
            chargeForCollectCurrency: "WMATIC",

            mirrorReferralReward: false,
            mirrorReferralRewardFee: 25.0,

            splitRevenueRecipients: [
              {
                recipient: "",
                split: 0.0,
              },
            ],

            limitedEdition: false,
            limitedEditionNumber: "1",

            timeLimit: false,
            endTimestamp: {
              date: "",
              time: "",
            },

            whoCanCollect: false,
          });

          setIsShareOpen(false);
          setMenu("share");
        } else if (res?.error) {
          toast.update(id, {
            render: res?.error,
            type: "error",
            isLoading: false,
            autoClose: 3000,
            closeButton: true,
          });
          setSharing(false);
        }
      })
      .catch((err) => {
        toast.update(id, {
          render: fnMessage(err),
          type: "error",
          isLoading: false,
          autoClose: 3000,
          closeButton: true,
        });
        setSharing(false);
      });
  };

  // if lensAuth = success => sharePost or else generateSignature then sharePost
  const handleLensClick = () => {
    if (isConnected && !getLensAuth) {
      generateSignature();
    } else if (isConnected && getLensAuth && !dispatcherState.message) {
      setDispatcherFn();
    } else if (isConnected && getLensAuth && dispatcherState.message) {
      sharePost("lens");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "chargeForCollectPrice") {
      if (value < 1) {
        setPriceError({
          isError: true,
          message: "Price should be greater than 0",
        });
      } else {
        setPriceError({
          isError: false,
          message: "",
        });
      }
    } else if (name === "limitedEditionNumber") {
      if (value < 1) {
        setEditionError({
          isError: true,
          message: "Collect limit should be greater than 0",
        });
      } else {
        setEditionError({
          isError: false,
          message: "",
        });
      }
    } else if (name === "mirrorReferralRewardFee") {
      if (value < 1) {
        setReferralError({
          isError: true,
          message: "Referral fee should be between 1% to 100%",
        });
      } else {
        setReferralError({
          isError: true,
          message: "",
        });
      }
    }

    if (name === "mirrorReferralRewardFee") {
      setEnabled((prevEnabled) => ({
        ...prevEnabled,
        [name]: Number(parseFloat(value).toFixed(2)),
      }));
    } else {
      setEnabled((prevEnabled) => ({ ...prevEnabled, [name]: value }));
    }
  };

  const restrictRecipientInput = (e, index, recipient) => {
    const isText = referredFromRef.current.includes(recipient.recipient);
    const isUserAddress = recipient.recipient === address;
    if (index === 0 || isText) {
      if (isUserAddress) {
        handleRecipientChange(index, "recipient", e.target.value);
      }
    } else {
      handleRecipientChange(index, "recipient", e.target.value);
    }
  };

  const restrictRemoveRecipient = (index, recipient) => {
    const istext = referredFromRef.current.includes(recipient.recipient);
    if (index === 0 || istext) {
      return true;
    }
  };

  // add recipient to the split list
  useEffect(() => {
    if (isConnected) {
      const updatedRecipients = referredFromRef.current
        .filter((item) => typeof item === "string")
        .slice(0, 4)
        .map((item) => ({
          recipient: item,
          split: 1.0,
        }));

      setEnabled((prevEnabled) => ({
        ...prevEnabled,
        splitRevenueRecipients: [
          {
            recipient: "@lenspostxyz.test",
            split: enabled.splitRevenueRecipients[0]?.split || 10.0,
          },
          ...updatedRecipients,
        ],
      }));
    }
  }, [address]);

  useEffect(() => {
    if (isError && error?.name === "UserRejectedRequestError") {
      setSharing(false);
      setIsLoading(false);
      toast.error("User rejected the signature request");
    }
  }, [isError]);

  useEffect(() => {
    if (isSuccess) {
      lensAuth();
    }
  }, [isSuccess]);

  useEffect(() => {
    checkDispatcherFn();
  }, []);

  return (
    <>
      <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl rounded-lg rounded-r-none ">
        <div className="">
          {/* <Dialog.Title className="w-full flex items-center gap-2 text-white text-xl leading-6 p-6 fixed bg-gray-900 z-10"> */}
          <div className="w-full flex justify-between items-center gap-2 text-white text-xl leading-6 p-4 bg-gray-900 rounded-lg rounded-r-none">
            <BsArrowLeft
              onClick={() => setMenu("share")}
              className="cursor-pointer"
            />
            Monetization Settings
            {/* </Dialog.Title> */}
            <div
              className="z-100 cursor-pointer"
              onClick={() => setIsShareOpen(!isShareOpen)}
            >
              <BsX size="24" />
            </div>
          </div>
        </div>
        <div className="relative px-4 mt-1 pt-2 pb-4 sm:px-6 ">
          <div className="">
            <div className="flex flex-col justify-between">
              <Switch.Group>
                <div className="mb-4">
                  <h2 className="text-lg mb-2">Charge for collecting</h2>
                  <div className="flex justify-between">
                    <Switch.Label className="w-4/5">
                      Get paid when someone collects your post
                    </Switch.Label>
                    <Switch
                      checked={enabled.chargeForCollect}
                      onChange={() => {
                        setEnabled({
                          ...enabled,
                          chargeForCollect: !enabled.chargeForCollect,
                        });
                      }}
                      className={`${
                        enabled.chargeForCollect
                          ? "bg-[#E1F26C]"
                          : "bg-gray-200"
                      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#E1F26C] focus:ring-offset-2`}
                    >
                      <span
                        className={`${
                          enabled.chargeForCollect
                            ? "translate-x-6"
                            : "translate-x-1"
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </Switch>
                  </div>
                  <div className={` ${!enabled.chargeForCollect && "hidden"}`}>
                    <div className="flex gap-5">
                      <div className="flex flex-col w-1/2 py-2">
                        <label htmlFor="price">Price</label>
                        <NumberInputBox
                          min={"1"}
                          step={"0.01"}
                          placeholder="0.0$"
                          name="chargeForCollectPrice"
                          onChange={(e) => handleChange(e)}
                          value={enabled.chargeForCollectPrice}
                        />
                      </div>
                      <div className="flex flex-col w-1/2 py-2">
                        <label htmlFor="price">Currency</label>
                        <select
                          name="chargeForCollectCurrency"
                          id="chargeForCollectCurrency"
                          className="border rounded-md py-[10px] outline-none focus:ring-1 focus:ring-blue-500"
                          onChange={handleChange}
                          value={enabled.chargeForCollectCurrency}
                        >
                          {tokenList().map((token, index) => {
                            return (
                              <option key={index} value={token.symbol}>
                                {token.name}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                    {priceError.isError && (
                      <InputErrorMsg message={priceError.message} />
                    )}
                  </div>
                </div>
                <div
                  className={`mb-4 ${!enabled.chargeForCollect && "hidden"}`}
                >
                  <h2 className="text-lg mb-2">Mirror referral award</h2>
                  <div className="flex justify-between">
                    <Switch.Label className="w-4/5">
                      Share your fee with people who amplify your content
                    </Switch.Label>
                    <Switch
                      checked={enabled.mirrorReferralReward}
                      onChange={() =>
                        setEnabled({
                          ...enabled,
                          mirrorReferralReward: !enabled.mirrorReferralReward,
                        })
                      }
                      className={`${
                        enabled.mirrorReferralReward
                          ? "bg-[#E1F26C]"
                          : "bg-gray-200"
                      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#E1F26C] focus:ring-offset-2`}
                    >
                      <span
                        className={`${
                          enabled.mirrorReferralReward
                            ? "translate-x-6"
                            : "translate-x-1"
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </Switch>
                  </div>
                  <div
                    className={`flex ${
                      !enabled.mirrorReferralReward && "hidden"
                    }`}
                  >
                    <div className="flex flex-col w-full py-2">
                      <label htmlFor="price">Referral fee(%)</label>
                      <NumberInputBox
                        min={0.0}
                        max={100.0}
                        step={0.01}
                        name="mirrorReferralRewardFee"
                        placeholder="0.0%"
                        onChange={(e) => handleChange(e)}
                        value={enabled.mirrorReferralRewardFee}
                      />
                      {referralError.isError && (
                        <InputErrorMsg message={referralError.message} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Split policy Card  start */}

                {enabled.chargeForCollect && <SplitPolicyCard />}

                {/* Split policy Card  end */}

                <div
                  className={`mb-4 ${!enabled.chargeForCollect && "hidden"}`}
                >
                  <h2 className="text-lg mb-2">Split Revenue</h2>
                  <div className="flex justify-between">
                    <Switch.Label className="w-4/5">
                      Set multiple recipients for the collect fee
                    </Switch.Label>
                  </div>
                  <div className="relative">
                    {enabled.splitRevenueRecipients.map((recipient, index) => {
                      return (
                        <>
                          <div
                            key={index}
                            className="flex justify-between gap-2 items-center w-full py-2"
                          >
                            <InputBox
                              placeholder="erc20 address or @xyz.lens"
                              value={recipient.recipient}
                              onChange={(e) =>
                                restrictRecipientInput(e, index, recipient)
                              }
                            />
                            <div className="flex justify-between items-center w-1/3">
                              <NumberInputBox
                                min={0}
                                max={100}
                                step={0.01}
                                placeholder="0.0%"
                                value={recipient.split}
                                onChange={(e) => {
                                  handleRecipientChange(
                                    index,
                                    "split",
                                    Number(
                                      parseFloat(e.target.value).toFixed(2)
                                    )
                                  );
                                }}
                              />
                              {!restrictRemoveRecipient(index, recipient) && (
                                <TiDelete
                                  className="h-6 w-6 cursor-pointer"
                                  color="red"
                                  onClick={() => removeRecipient(index)}
                                />
                              )}
                            </div>
                          </div>
                          {index == 0 && (
                            <div className="flex flex-row align-middle  text-center justify-start mt-1">
                              <span className="italic mt-2">
                                Small fee to support our team!
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })}
                    {splitError.isError && (
                      <InputErrorMsg message={splitError.message} />
                    )}
                    {enabled.splitRevenueRecipients.length < 5 && (
                      <div
                        className="bg-[#E1F26C] flex justify-between items-center cursor-pointer w-[40%] text-black p-2 rounded outline-none"
                        onClick={addRecipient}
                      >
                        <AiOutlinePlus className="h-5 w-5" />
                        <span>Add recipient</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mb-4">
                  <h2 className="text-lg mb-2">Limited Edition</h2>
                  <div className="flex justify-between">
                    <Switch.Label className="w-4/5">
                      Make the collects exclusive
                    </Switch.Label>
                    <Switch
                      checked={enabled.limitedEdition}
                      onChange={() =>
                        setEnabled({
                          ...enabled,
                          limitedEdition: !enabled.limitedEdition,
                        })
                      }
                      className={`${
                        enabled.limitedEdition ? "bg-[#E1F26C]" : "bg-gray-200"
                      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#E1F26C] focus:ring-offset-2`}
                    >
                      <span
                        className={`${
                          enabled.limitedEdition
                            ? "translate-x-6"
                            : "translate-x-1"
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </Switch>
                  </div>
                  <div
                    className={`flex ${!enabled.limitedEdition && "hidden"}`}
                  >
                    <div className="flex flex-col w-full py-2">
                      <label htmlFor="price">Collect limit</label>
                      <NumberInputBox
                        min={"1"}
                        step={"1"}
                        placeholder="1"
                        name="limitedEditionNumber"
                        onChange={(e) => handleChange(e)}
                        value={enabled.limitedEditionNumber}
                      />
                      {editionError.isError && (
                        <InputErrorMsg message={editionError.message} />
                      )}
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <h2 className="text-lg mb-2">Time Limit</h2>
                  <div className="flex justify-between">
                    <Switch.Label className="w-4/5">
                      Collect duration
                    </Switch.Label>
                    <Switch
                      checked={enabled.timeLimit}
                      onChange={() =>
                        setEnabled({
                          ...enabled,
                          timeLimit: !enabled.timeLimit,
                        })
                      }
                      className={`${
                        enabled.timeLimit ? "bg-[#E1F26C]" : "bg-gray-200"
                      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#E1F26C] focus:ring-offset-2`}
                    >
                      <span
                        className={`${
                          enabled.timeLimit ? "translate-x-6" : "translate-x-1"
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </Switch>
                  </div>
                  {/* Calender For Schedule - 18Jun2023 */}
                  <div className={`${!enabled.timeLimit && "hidden"} my-3`}>
                    <div
                      className={`
                      flex flex-col w-full`}
                    >
                      {/* <div className="m-1">Choose schedule time and date</div> */}
                      <DateTimePicker className="m-4" onChange={onCalChange} />
                    </div>

                    <div className={`flex flex-col my-2`}>
                      <div className="mt-1 mb-3">Schedule</div>
                      <div className="flex flex-row border-l-8 border-l-[#E1F26C] p-4 rounded-md">
                        <div className="flex flex-col">
                          <div className="text-4xl text-[#E699D9]">
                            {enabled.endTimestamp.date.slice(0, 2)}
                          </div>
                          <div className="text-lg text-[#2D346C]">
                            {enabled.endTimestamp.date.slice(2)}
                          </div>
                        </div>

                        <div className="flex flex-col ml-4">
                          <div className="ml-2 mt-10">
                            {enabled.endTimestamp.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <h2 className="text-lg mb-2">Who can collect</h2>
                  <div className="flex justify-between">
                    <Switch.Label className="w-4/5">
                      Only followers can collect
                    </Switch.Label>
                    <Switch
                      checked={enabled.whoCanCollect}
                      onChange={() =>
                        setEnabled({
                          ...enabled,
                          whoCanCollect: !enabled.whoCanCollect,
                        })
                      }
                      className={`${
                        enabled.whoCanCollect ? "bg-[#E1F26C]" : "bg-gray-200"
                      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#E1F26C] focus:ring-offset-2`}
                    >
                      <span
                        className={`${
                          enabled.whoCanCollect
                            ? "translate-x-6"
                            : "translate-x-1"
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </Switch>
                  </div>
                </div>
              </Switch.Group>
            </div>
          </div>
          <button
            disabled={sharing}
            onClick={handleLensClick}
            className="flex items-center justify-center w-full text-md bg-[#E1F26C]  py-2 h-10 rounded-md outline-none"
          >
            <BsLink45Deg className="m-2" />
            Share Now
          </button>
        </div>
      </div>
    </>
  );
};

export default LensShare;