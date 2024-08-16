import React, { useContext } from "react";
import { SectionTab, TextSection } from "polotno/side-panel";
import { Icon } from "@blueprintjs/core";
import { useStore } from "../../../../../hooks/polotno";
import { useQuery } from "@tanstack/react-query";
import { apiGetPolotnoTexts } from "../../../../../services";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { LoadingAnimatedComponent } from "../../../common";
import axios from "axios";
import { Context } from "../../../../../providers/context";
import { customOswaltMemeTxt } from "./customTxts/oswaltMemetxt/OswaltMemeTxt";
import oswaltMemeTxtImg from "./customTxts/oswaltMemetxt/oswaltMemeTxtImg.png";

export const CustomTextPanel = React.memo(() => {
  const store = useStore();
  const { setOpenBottomBar } = useContext(Context);

  const { data: textsData } = useQuery({
    queryKey: ["textFn"],
    queryFn: apiGetPolotnoTexts,
  });

  const fnLoadText = async (source, customJson = null) => {
    console.log(
      "fnLoadText called with source:",
      source,
      "and customJson:",
      customJson
    );
    try {
      let newChildren = [];

      if (customJson) {
        newChildren = [customJson];
      } else if (source) {
        const response = await axios.get(source);
        const textsJson = response.data;
        if (textsJson?.pages?.[0]?.children) {
          newChildren = textsJson.pages[0].children;
        } else {
          console.error("Invalid API JSON structure: children array not found");
          return;
        }
      }

      const currentJSON = store.toJSON();
      const updatedJSON = {
        ...currentJSON,
        pages: currentJSON.pages.map((page, index) => {
          if (index === 0) {
            return {
              ...page,
              children: [...(page.children || []), ...newChildren],
            };
          }
          return page;
        }),
      };

      if (!updatedJSON.pages) {
        updatedJSON.pages = [{ children: [] }];
      }
      if (!updatedJSON.pages[0]) {
        updatedJSON.pages[0] = { children: [] };
      }
      if (!updatedJSON.pages[0].children) {
        updatedJSON.pages[0].children = [];
      }


      updatedJSON.pages[0].children = [
        ...updatedJSON.pages[0].children,
        // Fixed a major bug - duplication of fonts
        // ...newChildren,
      ];

      console.log("Updated JSON:", updatedJSON);

      console.log("Loaded " + (customJson ? "custom JSON" : "API JSON"));
      store.loadJSON(updatedJSON, true);

      setOpenBottomBar(false);
    } catch (error) {
      console.error("Error loading text:", error);
    }
  };

  return (
    <>
      {!textsData && <LoadingAnimatedComponent />}
      <div className="grid grid-cols-2">
        <div
          onClick={() => fnLoadText(null, customOswaltMemeTxt)}
          className="border border-gray-200 rounded-lg p-2 m-2 cursor-pointer"
        >
          <LazyLoadImage src={oswaltMemeTxtImg} />
        </div>
        {textsData?.data?.items?.map((text, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-2 m-2 cursor-pointer"
            onClick={() => fnLoadText(text?.json)}
          >
            <LazyLoadImage src={text?.preview} />
          </div>
        ))}
      </div>
    </>
  );
});

// define the new custom section
const CustomTextSection = {
  name: "text",
  Tab: (props) => (
    <SectionTab name="Text" {...props}>
      <Icon icon="text" />
    </SectionTab>
  ),
  Panel: CustomTextPanel,
};

export default CustomTextSection;