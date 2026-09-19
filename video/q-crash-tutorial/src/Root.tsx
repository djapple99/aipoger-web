import "./index.css";
import { BibleComposition } from "./BibleComposition";
import { MyComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <BibleComposition />
    </>
  );
};
