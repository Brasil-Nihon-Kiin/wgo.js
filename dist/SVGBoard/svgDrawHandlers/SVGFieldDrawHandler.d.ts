import { SVGDrawHandler, SVGBoardConfig, BoardObjectSVGElements } from '../types';
import { FieldObject } from '../../BoardBase';
export default abstract class SVGFieldDrawHandler implements SVGDrawHandler {
    abstract createElement(config: SVGBoardConfig, addDef: (def: SVGElement) => void): SVGElement | BoardObjectSVGElements;
    updateElement(elem: BoardObjectSVGElements, boardObject: FieldObject<SVGDrawHandler>, config: SVGBoardConfig): void;
}