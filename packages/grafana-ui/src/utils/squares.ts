/**
 * This function will calculate how many squares we can fit inside a rectangle.
 * Please have a look at this post for more details about the implementation:
 * https://math.stackexchange.com/questions/466198/algorithm-to-get-the-maximum-size-of-n-squares-that-fit-into-a-rectangle-with-a
 *
 * @param parentWidth width of the parent container
 * @param parentHeight height of the parent container
 * @param numberOfChildren number of children that should fit in the parent container
 */
export const calculateGridDimensions = (
  parentWidth: number,
  parentHeight: number,
  itemSpacing: number,
  numberOfChildren: number
) => {
  const vertical = calculateSizeOfChild(parentWidth, parentHeight, numberOfChildren);
  const horizontal = calculateSizeOfChild(parentHeight, parentWidth, numberOfChildren);
  const square = Math.max(vertical, horizontal);
  let xCount = Math.floor(parentWidth / square);
  let yCount = Math.ceil(numberOfChildren / xCount);
  const empty = xCount * yCount - numberOfChildren;

  if (empty > 1) {
    // Avoid this layout:
    // [X][X][X]
    //    [X]
    yCount = Math.floor(parentHeight / square);
    xCount = Math.ceil(numberOfChildren / yCount);
  }

  const itemsOnLastRow = xCount - (xCount * yCount - numberOfChildren);
  const widthOnLastRow = parentWidth / itemsOnLastRow - itemSpacing / (itemsOnLastRow + 1);

  return {
    width: parentWidth / xCount - itemSpacing / (xCount + 1),
    height: parentHeight / yCount - itemSpacing / (yCount + 1),
    widthOnLastRow,
    xCount,
    yCount,
  };
};

function calculateSizeOfChild(parentWidth: number, parentHeight: number, numberOfChildren: number): number {
  const parts = Math.ceil(Math.sqrt((numberOfChildren * parentWidth) / parentHeight));

  if (Math.floor((parts * parentHeight) / parentWidth) * parts < numberOfChildren) {
    return parentHeight / Math.ceil((parts * parentHeight) / parentWidth);
  }

  return parentWidth / parts;
}
