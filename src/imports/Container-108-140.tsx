import svgPaths from "./svg-ctd1kr4i7w";

function Icon() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g id="Icon">
          <path d={svgPaths.p5a7a980} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Text() {
  return (
    <div className="bg-[#fe9a00] relative rounded-[6px] shrink-0 size-[24px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center px-[6px] relative size-full">
        <Icon />
      </div>
    </div>
  );
}

function Text1() {
  return (
    <div className="h-[18.711px] relative shrink-0 w-[60.336px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[18.72px] left-0 not-italic text-[#2e3a59] text-[12.48px] top-[-0.5px] whitespace-nowrap">ORD-2001</p>
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="absolute left-[3.66px] size-[8px] top-[4.36px]" data-name="Icon">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
        <g id="Icon">
          <path d={svgPaths.p7774b00} id="Vector" stroke="var(--stroke-0, #E7000B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.666667" />
        </g>
      </svg>
    </div>
  );
}

function Text2() {
  return (
    <div className="bg-[#ffe2e2] h-[16px] relative rounded-[4px] shrink-0 w-[48px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon1 />
        <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[12px] left-[13.66px] not-italic text-[#e7000b] text-[11px] top-[2.36px] whitespace-nowrap">RUSH</p>
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="content-stretch flex gap-[6px] h-[18.711px] items-center relative shrink-0 w-full" data-name="Container">
      <Text1 />
      <Text2 />
    </div>
  );
}

function Paragraph() {
  return (
    <div className="h-[14.398px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14.4px] left-0 not-italic text-[#64748b] text-[11px] top-[-1px] whitespace-nowrap">Ravi Kumar · Arun Selvam</p>
    </div>
  );
}

function Container2() {
  return (
    <div className="flex-[1_0_0] h-[33.109px] min-h-px min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Container3 />
        <Paragraph />
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="h-[33.109px] relative shrink-0 w-[148.758px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
        <Text />
        <Container2 />
      </div>
    </div>
  );
}

function Icon2() {
  return (
    <div className="absolute left-[9px] size-[12px] top-[6.03px]" data-name="Icon">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g clipPath="url(#clip0_99_57)" id="Icon">
          <path d={svgPaths.p3e7757b0} id="Vector" stroke="var(--stroke-0, #E7000B)" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 3V6L8 7" id="Vector_2" stroke="var(--stroke-0, #E7000B)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <clipPath id="clip0_99_57">
            <rect fill="white" height="12" width="12" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Container4() {
  return (
    <div className="bg-[#fef2f2] h-[22.32px] relative rounded-[10px] shrink-0 w-[58.313px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#ffc9c9] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon2 />
        <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[16.32px] left-[23px] not-italic text-[#e7000b] text-[11px] top-[2.5px] whitespace-nowrap">167m</p>
      </div>
    </div>
  );
}

function KitchenManagerView() {
  return (
    <div className="h-[53.109px] relative shrink-0 w-full" data-name="KitchenManagerView">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[14px] relative size-full">
          <Container1 />
          <Container4 />
        </div>
      </div>
    </div>
  );
}

function Text3() {
  return (
    <div className="bg-[#dbeafe] relative rounded-[16777200px] shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center px-[6px] py-[2px] relative">
        <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[13.92px] not-italic relative shrink-0 text-[#155dfc] text-[11px] whitespace-nowrap">Dine In</p>
      </div>
    </div>
  );
}

function Text4() {
  return (
    <div className="bg-[#f3f4f6] relative rounded-[16777200px] shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center px-[6px] py-[2px] relative">
        <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[13.92px] not-italic relative shrink-0 text-[#4a5565] text-[11px] whitespace-nowrap">Table 3</p>
      </div>
    </div>
  );
}

function KitchenManagerView1() {
  return (
    <div className="relative shrink-0 w-full" data-name="KitchenManagerView">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[6px] items-center pb-[8px] pl-[14px] relative w-full">
          <Text3 />
          <Text4 />
        </div>
      </div>
    </div>
  );
}

function Frame() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-0 top-0 w-[359.336px]">
      <KitchenManagerView />
      <KitchenManagerView1 />
    </div>
  );
}

function Text5() {
  return (
    <div className="bg-white relative rounded-[5px] shrink-0 size-[20px]" data-name="Text">
      <div aria-hidden="true" className="absolute border-[#d1d5dc] border-[2.5px] border-solid inset-0 pointer-events-none rounded-[5px]" />
    </div>
  );
}

function Text6() {
  return (
    <div className="flex-[268.555_0_0] h-[18px] min-h-px min-w-px relative" data-name="Text">
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.28px] left-0 not-italic text-[#2e3a59] text-[13px] top-0 whitespace-nowrap">Masala Dosa</p>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-h-px min-w-px relative">
      <Text5 />
      <Text6 />
    </div>
  );
}

function Text7() {
  return (
    <div className="h-[17px] relative shrink-0 w-[16.227px]" data-name="Text">
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[16.32px] left-[0.23px] not-italic text-[#ff6b35] text-[13px] top-0 whitespace-nowrap">x2</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between py-[2px] relative w-full">
        <Frame2 />
        <Text7 />
      </div>
    </div>
  );
}

function Icon3() {
  return (
    <div className="relative shrink-0 size-[12.5px]" data-name="Icon">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.5 12.5">
        <g id="Icon">
          <path d={svgPaths.p11970880} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}

function Text8() {
  return (
    <div className="bg-[#00c950] content-stretch flex items-center justify-center px-[3.75px] relative rounded-[5px] shrink-0 size-[20px]" data-name="Text">
      <Icon3 />
    </div>
  );
}

function Text9() {
  return (
    <div className="flex-[268.555_0_0] h-[18px] min-h-px min-w-px relative" data-name="Text">
      <p className="[text-decoration-skip-ink:none] absolute decoration-solid font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.28px] left-[0.67px] line-through not-italic text-[#94a3b8] text-[13px] top-0 whitespace-nowrap">Filter Coffee</p>
    </div>
  );
}

function Text10() {
  return (
    <div className="h-[17px] relative shrink-0 w-[16.227px]" data-name="Text">
      <p className="[text-decoration-skip-ink:none] absolute decoration-solid font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[16.32px] left-[0.23px] line-through not-italic text-[#94a3b8] text-[13px] top-0 whitespace-nowrap">x2</p>
    </div>
  );
}

function Frame1() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center py-[2px] relative w-full">
        <Text8 />
        <Text9 />
        <Text10 />
      </div>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[rgba(255,255,255,0.7)] relative rounded-[6px] shrink-0 w-full" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col gap-[10px] items-start justify-center p-[13px] relative w-full">
          <Frame3 />
          <div className="h-0 relative shrink-0 w-full">
            <div className="absolute inset-[-0.5px_0]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 317.336 1">
                <path d="M0 0.5H317.336" id="Vector 10" stroke="var(--stroke-0, #EDEDED)" />
              </svg>
            </div>
          </div>
          <Frame1 />
        </div>
      </div>
    </div>
  );
}

function KitchenManagerView2() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[-0.33px] px-[8px] top-[83px] w-[359.336px]" data-name="KitchenManagerView">
      <Button />
    </div>
  );
}

function Container6() {
  return <div className="bg-[#ff6b35] h-[8px] rounded-[16777200px] shrink-0 w-full" data-name="Container" />;
}

function Container5() {
  return (
    <div className="bg-[rgba(0,0,0,0.05)] flex-[310.109_0_0] h-[8px] min-h-px min-w-px relative rounded-[16777200px]" data-name="Container">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pr-[155.055px] relative size-full">
          <Container6 />
        </div>
      </div>
    </div>
  );
}

function Text11() {
  return (
    <div className="h-[15px] relative shrink-0 w-[16.109px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[14.4px] left-[0.11px] not-italic text-[#94a3b8] text-[11px] top-[calc(50%-7.5px)] whitespace-nowrap">1/2</p>
      </div>
    </div>
  );
}

function KitchenManagerView3() {
  return (
    <div className="absolute content-stretch flex gap-[8px] h-[22.398px] items-center left-[14px] top-[256px] w-[331.336px]" data-name="KitchenManagerView">
      <Container5 />
      <Text11 />
    </div>
  );
}

export default function Container() {
  return (
    <div className="bg-white border border-[#ededed] border-solid overflow-clip relative rounded-[12px] size-full" data-name="Container">
      <Frame />
      <KitchenManagerView2 />
      <KitchenManagerView3 />
    </div>
  );
}