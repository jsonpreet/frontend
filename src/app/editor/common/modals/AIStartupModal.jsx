import React, { useState } from "react";
import { CompSearch } from "../../sections/left-section/image/AIImageSection";
import { AIIcon } from "../../../../assets/assets";
import {
  Button,
  Dialog,
  DialogBody,
  DialogHeader,
} from "@material-tailwind/react";
import Gift from "../../../../assets/svgs/GiftOnboarding.svg";
import BsChevronRight from "@meronex/icons/bs/BsChevronRight";
import BsChevronLeft from "@meronex/icons/bs/BsChevronLeft";
import VscVerified from "@meronex/icons/vsc/VscVerified";
import useUser from "../../../../hooks/user/useUser";

const AIStartupModal = () => {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { points } = useUser();

  const handleOpen = () => setOpen(!open);

  const steps = [
    {
      title: "Congratulations!",
      content: (
        <>
          <div className="w-24 h-24 mx-auto mb-4 rounded-lg flex items-center justify-center">
            {/* <Gift className="w-16 h-16 text-[#E15F77]" /> */}
            <img src={Gift} alt="gift" />
          </div>
          <p className="text-xl mb-2">Boom! You've just earned</p>
          <p className="text-4xl font-bold text-[#E15F77] mb-4">50 xPOSTER</p>
          <p className="text-gray-600">
            create, share and earn more token 🍄🤑
          </p>
        </>
      ),
    },
    {
      title:
        "Woohoo! Your xPoster points are your creative Swiss Army knife! 🍖",
      content: (
        <ul className="space-y-2 text-left">
          {[
            "Create AI masterpieces 🧁",
            "Make backgrounds vanish like magic 🐰",
            "Save designs locally (your computer will thank you) 💻",
            'Auto-save your work (no more "oops" moments) 😅',
            "Remove watermarks with a snap ✨",
            "Join epic campaigns and snag token drops 🤑🍄",
          ].map((feature, index) => (
            <li key={index} className="flex items-start">
              <svg
                className="w-5 h-5 text-green-500 mr-2 mt-1 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: "Poster AI Magic",
      content: (
        <div className="flex flex-row justify-between items-center max-h-full min-h-full">
          <>
            <div className="w-1/4"> Left Section </div>
            <div className="w-3/4">
              <CompSearch />
            </div>
          </>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mr-12">
        <Button
          onClick={handleOpen}
          className="p-4 py-2 text-black bg-[#e1f16b] rounded-md"
        >
          <AIIcon />
          <span className="ml-2">AI</span>
        </Button>
        <Dialog open={open} handler={handleOpen}>
          {/* <DialogHeader>Poster AI Magic</DialogHeader> */}
          {/* <DialogBody> */}

          <div className="bg-white rounded-lg shadow-xl w-full p-6 relative">
            <div className="absolute top-2 right-2">
              <div className="flex items-center">
                <VscVerified className="inline-block w-5 h-5 text-[#E15F77] bg-[#fec6d0] rounded-full" />
                <span className="ml-1 text-gray-500">{points}</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-center">
              {steps[currentStep].title}
            </h2>
            <div className="text-center mb-6">{steps[currentStep].content}</div>
            <div className="flex justify-between items-center cursor-pointer">
              <div className="space-x-1">
                {steps.map((_, index) => (
                  <span
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`inline-block w-2 h-2 rounded-full ${
                      index === currentStep ? "bg-[#E15F77]" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
              {currentStep < steps.length && (
                <>
                  <div className="flex gap-2">
                    {currentStep > 0 && (
                      <button
                        onClick={() => setCurrentStep(currentStep - 1)}
                        className="bg-[#E15F77] text-white rounded-full p-2"
                      >
                        <BsChevronLeft className="w-4 h-4" />
                      </button>
                    )}

                    {currentStep < steps.length - 1 && (
                      <button
                        onClick={() => setCurrentStep(currentStep + 1)}
                        className="bg-[#E15F77] text-white rounded-full p-2"
                      >
                        <BsChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* </DialogBody> */}
        </Dialog>
      </div>
    </>
  );
};

export default AIStartupModal;
