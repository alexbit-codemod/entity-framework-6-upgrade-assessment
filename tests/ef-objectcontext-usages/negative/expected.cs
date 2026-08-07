using System;

namespace Sample
{
    public class RegularContext
    {
        public void Use()
        {
            // string mention should not count: "ObjectContext"
            var text = "ObjectContext";
            Console.WriteLine(text);
        }
    }
}
